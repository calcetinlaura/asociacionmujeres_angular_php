import { CommonModule } from '@angular/common';
import {
  Component,
  DestroyRef,
  ElementRef,
  inject,
  OnInit,
  ViewChild,
} from '@angular/core';
import { takeUntilDestroyed, toSignal } from '@angular/core/rxjs-interop';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatMenuModule } from '@angular/material/menu';
import { map, tap } from 'rxjs';

import { ProjectsFacade } from 'src/app/application/projects.facade';
import {
  ColumnModel,
  ColumnWidth,
} from 'src/app/core/interfaces/column.interface';
import { EventModelFullData } from 'src/app/core/interfaces/event.interface';
import { Filter } from 'src/app/core/interfaces/general.interface';
import { InvoiceModelFullData } from 'src/app/core/interfaces/invoice.interface';
import { ProjectModel } from 'src/app/core/interfaces/project.interface';
import { TypeActionModal, TypeList } from 'src/app/core/models/general.model';

import { EventsService } from 'src/app/core/services/events.services';
import { GeneralService } from 'src/app/core/services/generalService.service';
import { InvoicesService } from 'src/app/core/services/invoices.services';
import { PdfPrintService } from 'src/app/core/services/PdfPrintService.service';
import { ProjectsService } from 'src/app/core/services/projects.services';

import { DashboardHeaderComponent } from 'src/app/shared/components/dashboard-header/dashboard-header.component';
import { FiltersComponent } from 'src/app/shared/components/filters/filters.component';
import { ModalShellComponent } from 'src/app/shared/components/modal/modal-shell.component';
import { ModalNavService } from 'src/app/shared/components/modal/services/modal-nav.service';
import { ModalService } from 'src/app/shared/components/modal/services/modal.service';
import { SpinnerLoadingComponent } from 'src/app/shared/components/spinner-loading/spinner-loading.component';
import { StickyZoneComponent } from 'src/app/shared/components/sticky-zone/sticky-zone.component';
import { TableComponent } from 'src/app/shared/components/table/table.component';

// hooks reutilizables
import { PageToolbarComponent } from 'src/app/shared/components/page-toolbar/page-toolbar.component';
import { useColumnVisibility } from 'src/app/shared/hooks/use-column-visibility';
import { useEntityList } from 'src/app/shared/hooks/use-entity-list';

// toolbar común

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
    ModalShellComponent,
    PageToolbarComponent,
    // Angular
    CommonModule,
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
  private readonly projectsService = inject(ProjectsService);
  private readonly eventsService = inject(EventsService);
  private readonly invoicesService = inject(InvoicesService);
  readonly projectsFacade = inject(ProjectsFacade);
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
      title: 'Tareas presupuestadas',
      key: 'activities',
      sortable: true,
      showIndicatorOnEmpty: true,
      width: ColumnWidth.LG,
      footerTotal: true,
    },
    {
      title: 'Eventos',
      key: 'events',
      sortable: true,
      showIndicatorOnEmpty: true,
      width: ColumnWidth.XL,
      showLengthOnly: true,
    },
    {
      title: 'Facturas',
      key: 'invoices',
      sortable: true,
      showIndicatorOnEmpty: true,
      width: ColumnWidth.LG,
      footerTotal: true,
    },
  ];

  // ── Column visibility (hook)
  readonly col = useColumnVisibility(
    'projects-table',
    this.headerListProjects,
    ['description']
  );

  readonly list = useEntityList<ProjectModel>({
    filtered$: this.projectsFacade.filteredProjects$.pipe(map((v) => v ?? [])),
    sort: (arr) => this.projectsService.sortProjectsById(arr),
    count: (arr) => this.projectsService.countProjects(arr),
  });

  // Estado modal
  readonly modalVisibleSig = toSignal(this.modalService.modalVisibility$, {
    initialValue: false,
  });

  // Filtros
  filters: Filter[] = [];
  selectedFilter: number | null = null;
  readonly currentYear = this.generalService.currentYear;

  // Modal
  item: ProjectsModalItem | null = null;
  currentModalAction: TypeActionModal = TypeActionModal.Create;
  typeModal: TypeList = TypeList.Projects;
  typeSection: TypeList = TypeList.Projects;

  // Refs
  @ViewChild('printArea', { static: false })
  printArea!: ElementRef<HTMLElement>;

  // ──────────────────────────────────────────────────────────────────────────────
  // Lifecycle
  // ──────────────────────────────────────────────────────────────────────────────
  ngOnInit(): void {
    this.filters = [
      { code: '', name: 'Histórico' },
      ...this.generalService.getYearFilters(2018, this.currentYear),
    ];
    // Carga inicial por año actual
    this.filterSelected(this.currentYear.toString());
  }

  // ──────────────────────────────────────────────────────────────────────────────
  // Filtros / búsqueda
  // ──────────────────────────────────────────────────────────────────────────────
  filterSelected(filter: string): void {
    this.selectedFilter = filter === '' ? null : Number(filter);
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

    if (typeModal === TypeList.Projects && action === TypeActionModal.Create) {
      this.projectsFacade.clearSelectedProject();
    }

    this.modalService.openModal();
  }

  onCloseModal(): void {
    this.modalService.closeModal();
    this.item = null;
    this.modalNav.clear();
  }

  onOpenEvent(eventId: number): void {
    this.modalNav.push({
      typeModal: this.typeModal,
      action: this.currentModalAction,
      item: this.item,
    });
    this.eventsService
      .getEventById(eventId)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (event: EventModelFullData) =>
          this.openModal(TypeList.Events, TypeActionModal.Show, event),
        error: (err) => console.error('Error cargando evento', err),
      });
  }

  onOpenInvoice(invoiceId: number): void {
    this.modalNav.push({
      typeModal: this.typeModal,
      action: this.currentModalAction,
      item: this.item,
    });
    this.invoicesService
      .getInvoiceById(invoiceId)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (invoice: InvoiceModelFullData) =>
          this.openModal(TypeList.Invoices, TypeActionModal.Show, invoice),
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

  // Para el shell
  get canGoBack(): boolean {
    return this.modalNav.canGoBack() && !!this.item;
  }
}
