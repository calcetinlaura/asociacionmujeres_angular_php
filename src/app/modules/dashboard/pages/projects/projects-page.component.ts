import { CommonModule } from '@angular/common';
import {
  Component,
  DestroyRef,
  ElementRef,
  OnInit,
  Signal,
  ViewChild,
  WritableSignal,
  computed,
  inject,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormGroup, ReactiveFormsModule } from '@angular/forms';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatMenuModule } from '@angular/material/menu';
import { tap } from 'rxjs';

import { ProjectsFacade } from 'src/app/application/projects.facade';
import {
  ColumnModel,
  ColumnWidth,
} from 'src/app/core/interfaces/column.interface';
import { EventModelFullData } from 'src/app/core/interfaces/event.interface';
import { InvoiceModelFullData } from 'src/app/core/interfaces/invoice.interface'; // 👈 asunción habitual
import { ProjectModel } from 'src/app/core/interfaces/project.interface';
import {
  Filter,
  TypeActionModal,
  TypeList,
} from 'src/app/core/models/general.model';

import { EventsService } from 'src/app/core/services/events.services';
import { InvoicesService } from 'src/app/core/services/invoices.services';
import { ProjectsService } from 'src/app/core/services/projects.services';

import { DashboardHeaderComponent } from 'src/app/modules/dashboard/components/dashboard-header/dashboard-header.component';
import { TableComponent } from 'src/app/modules/dashboard/components/table/table.component';
import { FiltersComponent } from 'src/app/modules/landing/components/filters/filters.component';

import { ButtonIconComponent } from 'src/app/shared/components/buttons/button-icon/button-icon.component';
import { IconActionComponent } from 'src/app/shared/components/buttons/icon-action/icon-action.component';
import { InputSearchComponent } from 'src/app/shared/components/inputs/input-search/input-search.component';
import { SpinnerLoadingComponent } from 'src/app/shared/components/spinner-loading/spinner-loading.component';
import { GeneralService } from 'src/app/shared/services/generalService.service';
import { PdfPrintService } from 'src/app/shared/services/PdfPrintService.service';

import { StickyZoneComponent } from '../../components/sticky-zone/sticky-zone.component';
import { ColumnMenuComponent } from '../../components/table/column-menu.component';
import { ColumnVisibilityStore } from '../../components/table/column-visibility.store';

import { ModalShellComponent } from 'src/app/shared/components/modal/modal-shell.component';
import { ModalNavService } from 'src/app/shared/components/modal/services/modal-nav.service';
import { ModalService } from 'src/app/shared/components/modal/services/modal.service';

type ProjectsModalItem =
  | ProjectModel
  | EventModelFullData
  | InvoiceModelFullData;

@Component({
  selector: 'app-projects-page',
  standalone: true,
  imports: [
    // UI
    DashboardHeaderComponent,
    SpinnerLoadingComponent,
    StickyZoneComponent,
    TableComponent,
    FiltersComponent,
    ButtonIconComponent,
    IconActionComponent,
    InputSearchComponent,
    ColumnMenuComponent,
    ModalShellComponent,
    // Angular
    CommonModule,
    ReactiveFormsModule,
    MatMenuModule,
    MatCheckboxModule,
  ],
  templateUrl: './projects-page.component.html',
})
export class ProjectsPageComponent implements OnInit {
  // Servicios
  private readonly destroyRef = inject(DestroyRef);
  private readonly modalService = inject(ModalService);
  private readonly generalService = inject(GeneralService);
  private readonly pdfPrintService = inject(PdfPrintService);
  private readonly colStore = inject(ColumnVisibilityStore);

  readonly projectsFacade = inject(ProjectsFacade);
  private readonly projectsService = inject(ProjectsService);
  private readonly eventsService = inject(EventsService);
  private readonly invoicesService = inject(InvoicesService);

  // Navegación modal (stack para volver)
  private readonly modalNav = inject(ModalNavService<ProjectsModalItem>);

  // Tabla
  headerListProjects: ColumnModel[] = [
    { title: 'Título', key: 'title', sortable: true },
    {
      title: 'Año',
      key: 'year',
      sortable: true,
      width: ColumnWidth.XS,
      textAlign: 'center',
    },
    {
      title: 'Descripción',
      key: 'description',
      sortable: true,
      innerHTML: true,
      showIndicatorOnEmpty: true,
      width: ColumnWidth.LG,
    },
    {
      title: 'Subvención',
      key: 'subsidy_name',
      sortable: true,
      width: ColumnWidth.SM,
    },
    {
      title: 'Tareas',
      key: 'activities',
      sortable: true,
      width: ColumnWidth.LG,
    },
    { title: 'Eventos', key: 'events', sortable: true, width: ColumnWidth.XL },
    {
      title: 'Facturas',
      key: 'invoices',
      sortable: true,
      width: ColumnWidth.LG,
    },
  ];

  // Signals para columnas
  columnVisSig!: WritableSignal<Record<string, boolean>>;
  displayedColumnsSig!: Signal<string[]>;

  // Datos
  projects: ProjectModel[] = [];
  filteredProjects: ProjectModel[] = [];
  number = 0;

  // Filtros
  filters: Filter[] = [];
  selectedFilter: number | null = null;
  currentYear = this.generalService.currentYear;

  // Modal
  isModalVisible = false;
  item: ProjectsModalItem | null = null;
  currentModalAction: TypeActionModal = TypeActionModal.Create;
  typeModal: TypeList = TypeList.Projects;
  typeSection: TypeList = TypeList.Projects;

  // Form
  searchForm!: FormGroup;

  // Refs
  @ViewChild(InputSearchComponent)
  private inputSearchComponent!: InputSearchComponent;

  @ViewChild('printArea', { static: false })
  printArea!: ElementRef<HTMLElement>;

  // ──────────────────────────────────────────────────────────────────────────────
  // Lifecycle
  // ──────────────────────────────────────────────────────────────────────────────
  ngOnInit(): void {
    // Persistencia de columnas
    this.columnVisSig = this.colStore.init(
      'projects-table',
      this.headerListProjects,
      ['description'] // ocultas por defecto
    );
    this.displayedColumnsSig = computed(() =>
      this.colStore.displayedColumns(
        this.headerListProjects,
        this.columnVisSig()
      )
    );

    // Filtros por año
    this.filters = [
      { code: '', name: 'Histórico' },
      ...this.generalService.getYearFilters(2018, this.currentYear),
    ];

    // Visibilidad modal
    this.modalService.modalVisibility$
      .pipe(takeUntilDestroyed(this.destroyRef))
      .pipe(tap((isVisible) => (this.isModalVisible = isVisible)))
      .subscribe();

    // Carga inicial
    this.filterSelected(this.currentYear.toString());

    // Estado desde la facade
    this.projectsFacade.filteredProjects$
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        tap((projects) => this.updateProjectState(projects))
      )
      .subscribe();
  }

  // ──────────────────────────────────────────────────────────────────────────────
  // Filtros / búsqueda
  // ──────────────────────────────────────────────────────────────────────────────
  filterSelected(filter: string): void {
    this.selectedFilter = filter === '' ? null : Number(filter);
    this.generalService.clearSearchInput(this.inputSearchComponent);

    if (filter === '') {
      this.projectsFacade.loadAllProjects();
    } else {
      this.projectsFacade.loadProjectsByYear(Number(filter));
    }
  }

  applyFilterWord(keyword: string): void {
    this.projectsFacade.applyFilterWord(keyword);
  }

  // ──────────────────────────────────────────────────────────────────────────────
  // Modal + navegación
  // ──────────────────────────────────────────────────────────────────────────────
  addNewProjectModal(): void {
    this.openModal(TypeList.Projects, TypeActionModal.Create, null);
  }

  onOpenModal(project: {
    typeModal: TypeList;
    action: TypeActionModal;
    item?: ProjectModel;
  }): void {
    this.openModal(project.typeModal, project.action, project.item ?? null);
  }

  private openModal(
    typeModal: TypeList,
    action: TypeActionModal,
    item: ProjectsModalItem | null
  ): void {
    this.currentModalAction = action;
    this.typeModal = typeModal;
    this.item = item;

    // Limpiar seleccionado SOLO en CREATE de Proyectos
    if (typeModal === TypeList.Projects && action === TypeActionModal.Create) {
      this.projectsFacade.clearSelectedProject();
    }

    this.modalService.openModal();
  }

  onCloseModal(): void {
    this.modalService.closeModal();
    this.item = null;
    this.modalNav.clear(); // reset de navegación al cerrar
  }

  // Abrir Evento desde la modal de Proyecto
  onOpenEvent(eventId: number): void {
    // Guarda el estado actual para "volver"
    this.modalNav.push({
      typeModal: this.typeModal,
      action: this.currentModalAction,
      item: this.item,
    });

    this.eventsService
      .getEventById(eventId)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (event: EventModelFullData) => {
          this.openModal(TypeList.Events, TypeActionModal.Show, event);
        },
        error: (err) => console.error('Error cargando evento', err),
      });
  }

  // Abrir Factura desde la modal de Proyecto
  onOpenInvoice(invoiceId: number): void {
    console.log('ID INVOICE PROJECTS', invoiceId);
    // Guarda el estado actual para "volver"
    this.modalNav.push({
      typeModal: this.typeModal,
      action: this.currentModalAction,
      item: this.item,
    });

    this.invoicesService
      .getInvoiceById(invoiceId)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (invoice: InvoiceModelFullData) => {
          this.openModal(TypeList.Invoices, TypeActionModal.Show, invoice);
        },
        error: (err) => console.error('Error cargando factura', err),
      });
  }

  onBackModal(): void {
    const prev = this.modalNav.pop();
    if (!prev) return;
    this.currentModalAction = prev.action;
    this.item = prev.item;
    this.typeModal = prev.typeModal;
  }

  // ──────────────────────────────────────────────────────────────────────────────
  // CRUD
  // ──────────────────────────────────────────────────────────────────────────────
  onDelete({ type, id }: { type: TypeList; id: number }) {
    const actions: Partial<Record<TypeList, (id: number) => void>> = {
      [TypeList.Projects]: (x) => this.projectsFacade.deleteProject(x),
    };
    actions[type]?.(id);
  }

  sendFormProject(project: { itemId: number; formData: FormData }): void {
    const request$ = project.itemId
      ? this.projectsFacade.editProject(project.formData)
      : this.projectsFacade.addProject(project.formData);

    request$
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        tap(() => this.onCloseModal())
      )
      .subscribe();
  }

  // ──────────────────────────────────────────────────────────────────────────────
  // Estado tabla
  // ──────────────────────────────────────────────────────────────────────────────
  private updateProjectState(projects: ProjectModel[] | null): void {
    if (!projects) return;

    this.projects = this.projectsService.sortProjectsById(projects);
    this.filteredProjects = [...this.projects];
    this.number = this.projectsService.countProjects(projects);
  }

  getVisibleColumns(): ColumnModel[] {
    return this.colStore.visibleColumnModels(
      this.headerListProjects,
      this.columnVisSig()
    );
  }

  toggleColumn(key: string): void {
    this.colStore.toggle('projects-table', this.columnVisSig, key);
  }

  // ──────────────────────────────────────────────────────────────────────────────
  // Impresión
  // ──────────────────────────────────────────────────────────────────────────────
  async printTableAsPdf(): Promise<void> {
    if (!this.printArea) return;

    await this.pdfPrintService.printElementAsPdf(this.printArea, {
      filename: 'proyectos.pdf',
      preset: 'compact',
      orientation: 'landscape',
      format: 'a4',
      margins: [5, 5, 5, 5],
    });
  }

  // Para el template
  get canGoBack(): boolean {
    return this.modalNav.canGoBack();
  }
}
