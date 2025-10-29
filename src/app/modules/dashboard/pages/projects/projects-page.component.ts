import { CommonModule } from '@angular/common';
import {
  Component,
  DestroyRef,
  ElementRef,
  OnInit,
  ViewChild,
  computed,
  inject,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatMenuModule } from '@angular/material/menu';
import { map, tap } from 'rxjs';

import { FiltersFacade } from 'src/app/application/filters.facade';
import { ModalFacade } from 'src/app/application/modal.facade';
import { ProjectsFacade } from 'src/app/application/projects.facade';

import {
  ColumnModel,
  ColumnWidth,
} from 'src/app/core/interfaces/column.interface';
import { EventModelFullData } from 'src/app/core/interfaces/event.interface';
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
import { PageToolbarComponent } from 'src/app/shared/components/page-toolbar/page-toolbar.component';
import { SpinnerLoadingComponent } from 'src/app/shared/components/spinner-loading/spinner-loading.component';
import { StickyZoneComponent } from 'src/app/shared/components/sticky-zone/sticky-zone.component';
import { TableComponent } from 'src/app/shared/components/table/table.component';
import { useColumnVisibility } from 'src/app/shared/hooks/use-column-visibility';
import { useEntityList } from 'src/app/shared/hooks/use-entity-list';

type ProjectsModalItem =
  | ProjectModel
  | EventModelFullData
  | InvoiceModelFullData;

@Component({
  selector: 'app-projects-page',
  standalone: true,
  imports: [
    DashboardHeaderComponent,
    SpinnerLoadingComponent,
    StickyZoneComponent,
    TableComponent,
    FiltersComponent,
    ModalShellComponent,
    PageToolbarComponent,
    CommonModule,
    MatMenuModule,
    MatCheckboxModule,
  ],
  templateUrl: './projects-page.component.html',
})
export class ProjectsPageComponent implements OnInit {
  private readonly destroyRef = inject(DestroyRef);
  private readonly pdfPrintService = inject(PdfPrintService);
  private readonly generalService = inject(GeneralService);
  private readonly projectsService = inject(ProjectsService);
  private readonly eventsService = inject(EventsService);
  private readonly invoicesService = inject(InvoicesService);
  private readonly modalFacade = inject(ModalFacade);
  readonly projectsFacade = inject(ProjectsFacade);
  readonly filtersFacade = inject(FiltersFacade);

  //  Toolbar (para limpiar buscador)
  @ViewChild(PageToolbarComponent)
  private toolbarComponent!: PageToolbarComponent;

  // Ref impresión
  @ViewChild('printArea', { static: false })
  printArea!: ElementRef<HTMLElement>;

  // ────────────────────────────────────────────────
  // Columnas tabla
  // ────────────────────────────────────────────────
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

  readonly col = useColumnVisibility(
    'projects-table',
    this.headerListProjects,
    ['description']
  );

  // ────────────────────────────────────────────────
  // Lista reactiva
  // ────────────────────────────────────────────────
  readonly list = useEntityList<ProjectModel>({
    filtered$: this.projectsFacade.filteredProjects$.pipe(map((v) => v ?? [])),
    sort: (arr) => this.projectsService.sortProjectsById(arr),
    count: (arr) => this.projectsService.countProjects(arr),
  });

  readonly hasRowsSig = computed(() => this.list.countSig() > 0);
  readonly currentYear = this.generalService.currentYear;
  readonly TypeList = TypeList;

  // ────────────────────────────────────────────────
  // Modal controlado por facade
  // ────────────────────────────────────────────────
  readonly modalVisibleSig = this.modalFacade.isVisibleSig;
  readonly currentModalTypeSig = this.modalFacade.typeSig;
  readonly currentModalActionSig = this.modalFacade.actionSig;
  readonly currentItemSig = this.modalFacade.itemSig;

  // Lifecycle
  // ────────────────────────────────────────────────
  ngOnInit(): void {
    //  Carga de filtros automáticos (Histórico + años)
    this.filtersFacade.loadFiltersFor(TypeList.Projects);
  }

  ngAfterViewInit(): void {
    // Se aplica filtro inicial al cargar
    setTimeout(() => this.filterSelected(this.currentYear.toString()));
  }

  // ────────────────────────────────────────────────
  // Filtros / búsqueda
  // ────────────────────────────────────────────────
  filterSelected(filter: string): void {
    this.filtersFacade.selectFilter(filter);

    if (this.toolbarComponent) {
      this.toolbarComponent.clearSearch();
    }

    if (!filter) {
      this.projectsFacade.loadAllProjects();
    } else {
      this.projectsFacade.loadProjectsByYear(Number(filter));
    }
  }

  applyFilterWord(keyword: string): void {
    this.filtersFacade.setSearch(keyword);
    this.projectsFacade.applyFilterWord(keyword);
  }

  // ────────────────────────────────────────────────
  // Modal + navegación
  // ────────────────────────────────────────────────
  addNewProjectModal(): void {
    this.projectsFacade.clearSelectedProject();
    this.modalFacade.open(TypeList.Projects, TypeActionModal.Create, null);
  }

  onOpenModal(event: {
    typeModal: TypeList;
    action: TypeActionModal;
    item?: ProjectModel;
  }): void {
    const { typeModal, action, item } = event;
    this.modalFacade.open(typeModal, action, item ?? null);
  }

  onCloseModal(): void {
    this.modalFacade.close();
  }

  onBackModal(): void {
    this.modalFacade.back();
  }

  onOpenEvent(eventId: number): void {
    this.eventsService
      .getEventById(eventId)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (event: EventModelFullData) =>
          this.modalFacade.open(TypeList.Events, TypeActionModal.Show, event),
        error: (err) => console.error('Error cargando evento', err),
      });
  }

  onOpenInvoice(invoiceId: number): void {
    this.invoicesService
      .getInvoiceById(invoiceId)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (invoice: InvoiceModelFullData) =>
          this.modalFacade.open(
            TypeList.Invoices,
            TypeActionModal.Show,
            invoice
          ),
        error: (err) => console.error('Error cargando factura', err),
      });
  }

  // ────────────────────────────────────────────────
  // CRUD
  // ────────────────────────────────────────────────
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
        tap(() => this.modalFacade.close())
      )
      .subscribe();
  }

  // ────────────────────────────────────────────────
  // Impresión
  // ────────────────────────────────────────────────
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
}
