import { CommonModule, KeyValue } from '@angular/common';
import {
  Component,
  computed,
  DestroyRef,
  ElementRef,
  inject,
  OnInit,
  QueryList,
  ViewChild,
  ViewChildren,
} from '@angular/core';
import { takeUntilDestroyed, toSignal } from '@angular/core/rxjs-interop';
import { ReactiveFormsModule } from '@angular/forms';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatMenuModule } from '@angular/material/menu';
import { MatTabChangeEvent, MatTabsModule } from '@angular/material/tabs';
import { EMPTY, map, Observable, take } from 'rxjs';

import { InvoicesFacade } from 'src/app/application/invoices.facade';
import { ProjectsFacade } from 'src/app/application/projects.facade';
import { SubsidiesFacade } from 'src/app/application/subsidies.facade';

import {
  ColumnModel,
  ColumnWidth,
} from 'src/app/core/interfaces/column.interface';
import {
  categoryFilterSubsidies,
  SubsidyModel,
  SubsidyModelFullData,
} from 'src/app/core/interfaces/subsidy.interface';
import { TypeActionModal, TypeList } from 'src/app/core/models/general.model';

import { GeneralService } from 'src/app/core/services/generalService.service';
import { PdfPrintService } from 'src/app/core/services/PdfPrintService.service';
import { SubsidiesService } from 'src/app/core/services/subsidies.services';
import { DashboardHeaderComponent } from 'src/app/shared/components/dashboard-header/dashboard-header.component';
import { FiltersComponent } from 'src/app/shared/components/filters/filters.component';
import { SpinnerLoadingComponent } from 'src/app/shared/components/spinner-loading/spinner-loading.component';

import { StickyZoneComponent } from 'src/app/shared/components/sticky-zone/sticky-zone.component';
import { ColumnVisibilityStore } from 'src/app/shared/components/table/column-visibility.store';
import { TableComponent } from 'src/app/shared/components/table/table.component';

import { ModalShellComponent } from 'src/app/shared/components/modal/modal-shell.component';
import { ModalService } from 'src/app/shared/components/modal/services/modal.service';

import { InvoiceModelFullData } from 'src/app/core/interfaces/invoice.interface';
import { ProjectModelFullData } from 'src/app/core/interfaces/project.interface';
import { InvoicesService } from 'src/app/core/services/invoices.services';
import { ProjectsService } from 'src/app/core/services/projects.services';
import { ModalNavService } from 'src/app/shared/components/modal/services/modal-nav.service';

// hooks
import { Filter } from 'src/app/core/interfaces/general.interface';
import { PageToolbarComponent } from 'src/app/shared/components/page-toolbar/page-toolbar.component';
import { useColumnVisibility } from 'src/app/shared/hooks/use-column-visibility';
import { useEntityList } from 'src/app/shared/hooks/use-entity-list';
import { ModalShowSubsidyComponent } from './components/tab-subsidy/tab-subsidies.component';
type ModalItem =
  | SubsidyModel
  | SubsidyModelFullData
  | ProjectModelFullData
  | InvoiceModelFullData
  | null;

@Component({
  selector: 'app-subsidies-page',
  standalone: true,
  imports: [
    CommonModule,
    DashboardHeaderComponent,
    ModalShellComponent,
    ReactiveFormsModule,
    FiltersComponent,
    MatTabsModule,
    SpinnerLoadingComponent,
    TableComponent,
    MatMenuModule,
    MatCheckboxModule,
    StickyZoneComponent,
    PageToolbarComponent,
    ModalShowSubsidyComponent,
  ],
  providers: [SubsidiesService],
  templateUrl: './subsidies-page.component.html',
})
export class SubsidiesPageComponent implements OnInit {
  private readonly destroyRef = inject(DestroyRef);
  private readonly modalService = inject(ModalService);
  private readonly generalService = inject(GeneralService);
  private readonly pdfPrintService = inject(PdfPrintService);

  readonly subsidiesFacade = inject(SubsidiesFacade);
  private readonly invoicesFacade = inject(InvoicesFacade);
  private readonly invoicesService = inject(InvoicesService);
  private readonly projectsFacade = inject(ProjectsFacade);
  private readonly projectsService = inject(ProjectsService);
  private readonly subsidiesService = inject(SubsidiesService);
  private readonly colStore = inject(ColumnVisibilityStore);
  private readonly modalNav = inject(
    ModalNavService<
      SubsidyModelFullData | ProjectModelFullData | InvoiceModelFullData
    >
  );

  @ViewChildren(ModalShowSubsidyComponent)
  tabSubsidies!: QueryList<ModalShowSubsidyComponent>;

  // ── Columnas
  headerListSubsidies: ColumnModel[] = [
    { title: 'Nombre', key: 'nameSubsidy', sortable: true },
    {
      title: 'Año',
      key: 'year',
      sortable: true,
      width: ColumnWidth.XS,
      textAlign: 'center',
    },
    {
      title: 'Fecha Max. Presentación',
      key: 'date_presentation',
      sortable: true,
      pipe: 'date : dd MMM yyyy',
      width: ColumnWidth.XS,
      showIndicatorOnEmpty: true,
      textAlign: 'center',
    },
    {
      title: 'Fecha Max. Justificación',
      key: 'date_justification',
      sortable: true,
      pipe: 'date : dd MMM yyyy',
      width: ColumnWidth.XS,
      showIndicatorOnEmpty: true,
      textAlign: 'center',
    },
    {
      title: 'Periodo',
      key: 'start',
      sortable: true,
      width: ColumnWidth.XS,
      showIndicatorOnEmpty: true,
      textAlign: 'center',
    },
    {
      title: 'Proyectos',
      key: 'projects',
      sortable: true,
      width: ColumnWidth.XS,
      showLengthOnly: true,
    },
    {
      title: 'Facturas',
      key: 'invoices',
      sortable: true,
      width: ColumnWidth.XS,
      showLengthOnly: true,
    },
    {
      title: 'Link Bases',
      key: 'url_presentation',
      sortable: true,
      width: ColumnWidth.XS,
      booleanIndicator: true,
    },
    {
      title: 'Link Resolución',
      key: 'url_justification',
      sortable: true,
      width: ColumnWidth.XS,
      booleanIndicator: true,
    },
    {
      title: 'Cant. Solicitada',
      key: 'amount_requested',
      sortable: true,
      width: ColumnWidth.XS,
      pipe: 'eurosFormat',
      showIndicatorOnEmpty: true,
      textAlign: 'right',
    },
    {
      title: 'Cant. Condecida',
      key: 'amount_granted',
      sortable: true,
      width: ColumnWidth.XS,
      pipe: 'eurosFormat',
      footerTotal: true,
      showIndicatorOnEmpty: true,
      textAlign: 'right',
    },
    {
      title: 'Cant. Justificar',
      key: 'amount_justified',
      sortable: true,
      width: ColumnWidth.XS,
      pipe: 'eurosFormat',
      showIndicatorOnEmpty: true,
      textAlign: 'right',
    },
    {
      title: 'Cant. Gastada',
      key: 'amount_spent_irpf',
      sortable: true,
      width: ColumnWidth.XS,
      pipe: 'eurosFormat',
      showIndicatorOnEmpty: true,
      textAlign: 'right',
    },
    {
      title: 'Aporte Asociación',
      key: 'amount_association_irpf',
      sortable: true,
      width: ColumnWidth.XS,
      pipe: 'eurosFormat',
      footerTotal: true,
      showIndicatorOnEmpty: true,
      textAlign: 'right',
    },
  ];

  // ── Column visibility (hook)
  readonly col = useColumnVisibility(
    'subsidies-table',
    this.headerListSubsidies,
    ['date_justification', 'start', 'url_presentation', 'url_justification']
  );

  // ── Lista (hook): filtered → map → sort → count
  readonly list = useEntityList<SubsidyModelFullData>({
    filtered$: this.subsidiesFacade.filteredSubsidies$.pipe(
      map((v) => v ?? [])
    ),
    map: (arr) => arr.map((sub) => ({ ...sub, nameSubsidy: sub.name })),
    sort: (arr) => this.subsidiesService.sortSubsidiesByYear(arr),
    count: (arr) => this.subsidiesService.countSubsidies(arr),
  });
  // Filtros
  selectedFilter: string | number = '';

  // Modal
  readonly modalVisibleSig = toSignal(this.modalService.modalVisibility$, {
    initialValue: false,
  });

  // Estado de UI y datos adicionales
  typeSection = TypeList;
  typePage: TypeList = TypeList.Subsidies;
  typeModal: TypeList = TypeList.Subsidies;
  currentModalAction: TypeActionModal = TypeActionModal.Create;

  selectedIndex = 0;
  showAllSubsidies = false;

  item: ModalItem = null;
  currentYear = this.generalService.currentYear;

  // vista "todos": agrupación por año (Record<year, Subsidy[]>)
  groupedByYearSig = computed(() => {
    const groups: Record<string, SubsidyModelFullData[]> = {};
    for (const s of this.list.processedSig()) {
      const y = String(s.year);
      if (!groups[y]) groups[y] = [];
      groups[y].push(s);
    }
    return groups;
  });

  // tabs visibles (cuando NO es "todos")
  visibleTabs: { label: string; item: SubsidyModelFullData }[] = [];
  activeTabKey: string | null = null;
  makeKey = (s: SubsidyModelFullData) => `${s.name}__${s.year}`;

  // Filtros
  filters: Filter[] = [
    { code: '', name: 'Histórico' },
    ...inject(GeneralService).getYearFilters(
      2018,
      inject(GeneralService).currentYear
    ),
  ];

  @ViewChild('printArea', { static: false })
  printArea!: ElementRef<HTMLElement>;

  ngOnInit(): void {
    // eventos de guardado/borrado para refrescar
    this.projectsFacade.saved$
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(() => this.afterProjectChanged());
    this.projectsFacade.deleted$
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(() => this.afterProjectChanged());
    this.subsidiesFacade.saved$
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(() => this.afterSubsidyChanged());
    this.subsidiesFacade.deleted$
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(() => this.afterSubsidyChanged());
    this.invoicesFacade.saved$
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(() => this.afterInvoiceChanged());
    this.invoicesFacade.deleted$
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(() => this.afterInvoiceChanged());

    // construir tabs cuando llegan datos (salvo vista "todos")
    this.subsidiesFacade.filteredSubsidies$
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((subs) => {
        const list = (subs ?? []).map((s) => ({ ...s, nameSubsidy: s.name }));
        const sorted = this.subsidiesService.sortSubsidiesByYear(list);
        if (!this.showAllSubsidies) this.classifySubsidies(sorted);
      });

    // carga inicial
    this.filterSelected('');
  }

  // ──────────────────────────────────────────────
  // Filtros / tabs / búsqueda
  // ──────────────────────────────────────────────
  filterSelected(filter: string): void {
    this.selectedIndex = 0;
    this.activeTabKey = null;

    this.selectedFilter = filter === '' ? '' : Number(filter);
    if (filter === '') {
      this.showAllSubsidies = true;
      this.subsidiesFacade.loadAllSubsidies();
    } else {
      this.showAllSubsidies = false;
      this.subsidiesFacade.loadSubsidiesByYear(Number(filter));
    }
  }

  applyFilterWord(keyword: string): void {
    this.subsidiesFacade.applyFilterWord(keyword);
  }

  // crea pestañas por categoría (basado en tu lógica original)
  private classifySubsidies(subsidies: SubsidyModelFullData[]): void {
    const byType: Record<string, SubsidyModelFullData[]> = {};
    categoryFilterSubsidies.forEach((f) => (byType[f.code] = []));
    subsidies.forEach((s) => {
      const code = s.name; // ← tu lógica original
      if (byType[code]) byType[code].push(s);
    });

    this.visibleTabs = categoryFilterSubsidies
      .map((f) => {
        const items = byType[f.code];
        return items?.length
          ? { label: 'Sub. ' + f.name, item: items[0] }
          : null;
      })
      .filter(
        (t): t is { label: string; item: SubsidyModelFullData } => t !== null
      );

    // conservar pestaña activa si existe
    if (this.activeTabKey && this.visibleTabs.length > 0) {
      const idx = this.visibleTabs.findIndex(
        (t) => this.makeKey(t.item) === this.activeTabKey
      );
      this.selectedIndex =
        idx >= 0
          ? idx
          : Math.min(this.selectedIndex, this.visibleTabs.length - 1);
    } else {
      this.selectedIndex = 0;
    }
  }

  tabActive(event: MatTabChangeEvent): void {
    this.selectedIndex = event.index;
    const tab = this.visibleTabs[event.index];
    this.activeTabKey = tab ? this.makeKey(tab.item) : null;

    setTimeout(() => {
      const selectedTab = this.tabSubsidies.toArray()[event.index];
      selectedTab?.load();
    });
  }

  // ──────────────────────────────────────────────
  // Post-acciones
  // ──────────────────────────────────────────────
  private afterProjectChanged() {
    this.onCloseModal();
    if (!this.showAllSubsidies) this.reloadActiveTab();
    const year = Number(this.selectedFilter) ?? this.currentYear;
    this.subsidiesFacade.loadSubsidiesByYear(year);
  }
  private afterSubsidyChanged() {
    this.onCloseModal();
    if (this.showAllSubsidies) this.filterSelected('');
    else this.reloadActiveTab();
  }
  private afterInvoiceChanged() {
    this.onCloseModal();
    if (this.showAllSubsidies) {
      this.filterSelected((this.selectedFilter ?? this.currentYear).toString());
    } else {
      this.reloadActiveTab();
    }
  }
  private reloadActiveTab(): void {
    const current = this.visibleTabs[this.selectedIndex];
    this.activeTabKey = current
      ? this.makeKey(current.item)
      : this.activeTabKey;
    const selected = this.tabSubsidies.toArray()[this.selectedIndex];
    selected?.load();
  }

  // ──────────────────────────────────────────────
  // Modal + navegación
  // ──────────────────────────────────────────────
  addNewSubsidyModal(): void {
    this.openModal(this.typeModal, TypeActionModal.Create, null);
  }

  onOpenModal(event: {
    typeModal: TypeList;
    action: TypeActionModal;
    item: ModalItem;
  }): void {
    this.openModal(event.typeModal, event.action, event.item ?? null);
  }

  private openModal(
    typeModal: TypeList,
    action: TypeActionModal,
    item: ModalItem
  ): void {
    this.currentModalAction = action;
    this.item = item;
    this.typeModal = typeModal;

    if (typeModal === TypeList.Subsidies && action === TypeActionModal.Create) {
      this.subsidiesFacade.clearSelectedSubsidy();
    }
    if (typeModal === TypeList.Projects && action === TypeActionModal.Create) {
      this.projectsFacade.clearSelectedProject();
    }
    if (typeModal === TypeList.Invoices && action === TypeActionModal.Create) {
      this.invoicesFacade.clearSelectedInvoice();
    }

    this.modalService.openModal();
  }

  onCloseModal(): void {
    this.modalService.closeModal();
    this.item = null;
  }

  onOpenProject(projectId: number): void {
    this.modalNav.push({
      typeModal: this.typeModal,
      action: this.currentModalAction,
      item: this.item,
    });
    this.projectsService
      .getProjectById(projectId)
      .pipe(take(1))
      .subscribe({
        next: (project) =>
          this.openModal(TypeList.Projects, TypeActionModal.Show, project),
        error: (err) => console.error('Error cargando proyecto', err),
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
      .pipe(take(1))
      .subscribe({
        next: (invoice) =>
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
  get canGoBack(): boolean {
    return this.modalNav.canGoBack() && !!this.item;
  }

  // ──────────────────────────────────────────────
  // CRUD
  // ──────────────────────────────────────────────
  onDelete({ type, id }: { type: TypeList; id: number }) {
    const ops: Partial<Record<TypeList, (id: number) => Observable<any>>> = {
      [this.typeSection.Invoices]: (x) => (
        this.invoicesFacade.deleteInvoice(x), EMPTY
      ),
      [this.typeSection.Projects]: (x) => (
        this.projectsFacade.deleteProject(x), EMPTY
      ),
      [this.typeSection.Subsidies]: (x) => (
        this.subsidiesFacade.deleteSubsidy(x), EMPTY
      ),
    };
    ops[type]?.(id).pipe(take(1)).subscribe();
  }

  sendFormSubsidy(event: { itemId: number; formData: FormData }): void {
    const req$ = event.itemId
      ? this.subsidiesFacade.editSubsidy(event.formData)
      : this.subsidiesFacade.addSubsidy(event.formData);
    req$.pipe(take(1)).subscribe();
  }
  sendFormProject(event: { itemId?: number; formData: FormData }) {
    const obs = event.itemId
      ? this.projectsFacade.editProject(event.formData)
      : this.projectsFacade.addProject(event.formData);
    obs.pipe(take(1)).subscribe();
  }
  sendFormInvoice(event: { itemId: number; formData: FormData }): void {
    const req$ = event.itemId
      ? this.invoicesFacade.editInvoice(event.formData)
      : this.invoicesFacade.addInvoice(event.formData);
    req$.pipe(take(1)).subscribe();
  }

  // ──────────────────────────────────────────────
  // Impresión
  // ──────────────────────────────────────────────
  async printTableAsPdf(): Promise<void> {
    if (!this.printArea) return;
    await this.pdfPrintService.printElementAsPdf(this.printArea, {
      filename: 'subvenciones.pdf',
      preset: 'compact',
      orientation: 'landscape',
      format: 'a4',
      margins: [5, 5, 5, 5],
    });
  }

  sortYearsDesc(
    a: KeyValue<string, SubsidyModelFullData[]>,
    b: KeyValue<string, SubsidyModelFullData[]>
  ) {
    return Number(b.key) - Number(a.key);
  }
}
