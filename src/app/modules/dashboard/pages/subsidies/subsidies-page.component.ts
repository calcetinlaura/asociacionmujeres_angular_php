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
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ReactiveFormsModule } from '@angular/forms';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatMenuModule } from '@angular/material/menu';
import { MatTabChangeEvent, MatTabsModule } from '@angular/material/tabs';
import { map, take } from 'rxjs';

import { FiltersFacade } from 'src/app/application/filters.facade';
import { InvoicesFacade } from 'src/app/application/invoices.facade';
import { ModalFacade } from 'src/app/application/modal.facade';
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
import { ModalShellComponent } from 'src/app/shared/components/modal/modal-shell.component';
import { PageToolbarComponent } from 'src/app/shared/components/page-toolbar/page-toolbar.component';
import { SpinnerLoadingComponent } from 'src/app/shared/components/spinner-loading/spinner-loading.component';
import { StickyZoneComponent } from 'src/app/shared/components/sticky-zone/sticky-zone.component';
import { TableComponent } from 'src/app/shared/components/table/table.component';

import { Filter } from 'src/app/core/interfaces/general.interface';
import { InvoiceModelFullData } from 'src/app/core/interfaces/invoice.interface';
import { ProjectModelFullData } from 'src/app/core/interfaces/project.interface';
import { InvoicesService } from 'src/app/core/services/invoices.services';
import { ProjectsService } from 'src/app/core/services/projects.services';
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
  private readonly generalService = inject(GeneralService);
  private readonly pdfPrintService = inject(PdfPrintService);

  readonly subsidiesFacade = inject(SubsidiesFacade);
  readonly filtersFacade = inject(FiltersFacade);
  readonly modalFacade = inject(ModalFacade);
  private readonly invoicesFacade = inject(InvoicesFacade);
  private readonly invoicesService = inject(InvoicesService);
  private readonly projectsFacade = inject(ProjectsFacade);
  private readonly projectsService = inject(ProjectsService);
  private readonly subsidiesService = inject(SubsidiesService);

  @ViewChildren(ModalShowSubsidyComponent)
  tabSubsidies!: QueryList<ModalShowSubsidyComponent>;

  @ViewChild('printArea', { static: false })
  printArea!: ElementRef<HTMLElement>;

  readonly TypeList = TypeList;

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
      title: 'Cant. Concedida',
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

  readonly col = useColumnVisibility(
    'subsidies-table',
    this.headerListSubsidies,
    ['date_justification', 'start', 'url_presentation', 'url_justification']
  );

  // ───────────────────────────────
  // Estado general
  // ───────────────────────────────
  readonly modalVisibleSig = this.modalFacade.isVisibleSig;
  readonly currentModalTypeSig = this.modalFacade.typeSig;
  readonly currentModalActionSig = this.modalFacade.actionSig;
  readonly currentItemSig = this.modalFacade.itemSig;

  typePage: TypeList = TypeList.Subsidies;
  selectedIndex = 0;
  showAllSubsidies = false;
  currentYear = this.generalService.currentYear;

  // ───────────────────────────────
  // Lista y agrupaciones
  // ───────────────────────────────
  readonly list = useEntityList<SubsidyModelFullData>({
    filtered$: this.subsidiesFacade.filteredSubsidies$.pipe(
      map((v) => v ?? [])
    ),
    map: (arr) => arr.map((sub) => ({ ...sub, nameSubsidy: sub.name })),
    sort: (arr) => this.subsidiesService.sortSubsidiesByYear(arr),
    count: (arr) => this.subsidiesService.countSubsidies(arr),
  });

  readonly groupedByYearSig = computed(() => {
    const groups: Record<string, SubsidyModelFullData[]> = {};
    for (const s of this.list.processedSig()) {
      const y = String(s.year);
      (groups[y] ??= []).push(s);
    }
    return groups;
  });

  visibleTabs: { label: string; item: SubsidyModelFullData }[] = [];
  activeTabKey: string | null = null;
  makeKey = (s: SubsidyModelFullData) => `${s.name}__${s.year}`;

  // ───────────────────────────────
  // Lifecycle
  // ───────────────────────────────
  ngOnInit(): void {
    // Inicializa filtros dinámicos desde la fachada
    this.filtersFacade.loadFiltersFor(TypeList.Subsidies, '', 2018);

    // Suscribe para mantener tabs actualizadas
    this.subsidiesFacade.filteredSubsidies$
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((subs) => {
        const list = (subs ?? []).map((s) => ({ ...s, nameSubsidy: s.name }));
        const sorted = this.subsidiesService.sortSubsidiesByYear(list);
        if (!this.showAllSubsidies) this.classifySubsidies(sorted);
      });

    // Carga inicial
    this.filterSelected(String(this.filtersFacade.selectedSig()));
  }

  // ───────────────────────────────
  // Filtros
  // ───────────────────────────────
  get filters(): Filter[] {
    return this.filtersFacade.filtersSig();
  }

  get selectedFilter(): string | number {
    return this.filtersFacade.selectedSig();
  }

  filterSelected(filter: string): void {
    this.selectedIndex = 0;
    this.activeTabKey = null;
    this.filtersFacade.selectFilter(filter);

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

  // ───────────────────────────────
  // Clasificación de subvenciones
  // ───────────────────────────────
  private classifySubsidies(subsidies: SubsidyModelFullData[]): void {
    const byType: Record<string, SubsidyModelFullData[]> = {};
    categoryFilterSubsidies.forEach((f) => (byType[f.code] = []));
    subsidies.forEach((s) => {
      const code = s.name;
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
    setTimeout(() => this.tabSubsidies.toArray()[event.index]?.load());
  }

  // ───────────────────────────────
  // Modales
  // ───────────────────────────────
  addNewSubsidyModal(): void {
    this.subsidiesFacade.clearSelectedSubsidy();
    this.modalFacade.open(TypeList.Subsidies, TypeActionModal.Create, null);
  }

  onOpenModal(event: {
    typeModal: TypeList;
    action: TypeActionModal;
    item: ModalItem;
  }): void {
    this.modalFacade.open(event.typeModal, event.action, event.item ?? null);
  }

  onCloseModal(): void {
    this.modalFacade.close();
  }

  onBackModal(): void {
    this.modalFacade.back();
  }

  onOpenProject(projectId: number): void {
    this.projectsService
      .getProjectById(projectId)
      .pipe(take(1))
      .subscribe({
        next: (project) =>
          this.modalFacade.open(
            TypeList.Projects,
            TypeActionModal.Show,
            project
          ),
      });
  }

  onOpenInvoice(invoiceId: number): void {
    this.invoicesService
      .getInvoiceById(invoiceId)
      .pipe(take(1))
      .subscribe({
        next: (invoice) =>
          this.modalFacade.open(
            TypeList.Invoices,
            TypeActionModal.Show,
            invoice
          ),
      });
  }

  onDelete({ type, id }: { type: TypeList; id: number }) {
    const actions: Partial<Record<TypeList, (id: number) => void>> = {
      [TypeList.Invoices]: (x) => this.invoicesFacade.deleteInvoice(x),
      [TypeList.Projects]: (x) => this.projectsFacade.deleteProject(x),
      [TypeList.Subsidies]: (x) => this.subsidiesFacade.deleteSubsidy(x),
    };
    actions[type]?.(id);
  }

  // ───────────────────────────────
  // Envío de formularios
  // ───────────────────────────────
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

  // ───────────────────────────────
  // PDF
  // ───────────────────────────────
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

  // ───────────────────────────────
  // Utilidades
  // ───────────────────────────────
  sortYearsDesc(
    a: KeyValue<string, SubsidyModelFullData[]>,
    b: KeyValue<string, SubsidyModelFullData[]>
  ) {
    return Number(b.key) - Number(a.key);
  }
}
