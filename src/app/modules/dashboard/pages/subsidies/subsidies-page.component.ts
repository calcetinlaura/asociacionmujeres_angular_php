import { CommonModule, KeyValue } from '@angular/common';
import {
  Component,
  computed,
  DestroyRef,
  ElementRef,
  inject,
  OnInit,
  QueryList,
  Signal,
  ViewChild,
  ViewChildren,
  WritableSignal,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ReactiveFormsModule } from '@angular/forms';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatMenuModule } from '@angular/material/menu';
import { MatTabChangeEvent, MatTabsModule } from '@angular/material/tabs';
import { EMPTY, Observable, take } from 'rxjs';

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
import {
  Filter,
  TypeActionModal,
  TypeList,
} from 'src/app/core/models/general.model';

import { SubsidiesService } from 'src/app/core/services/subsidies.services';

import { DashboardHeaderComponent } from 'src/app/modules/dashboard/components/dashboard-header/dashboard-header.component';
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
import { TableComponent } from '../../components/table/table.component';

import { ModalShellComponent } from 'src/app/shared/components/modal/modal-shell.component';
import { ModalService } from 'src/app/shared/components/modal/services/modal.service';

import { InvoiceModelFullData } from 'src/app/core/interfaces/invoice.interface';
import { ProjectModelFullData } from 'src/app/core/interfaces/project.interface';
import { InvoicesService } from 'src/app/core/services/invoices.services';
import { ProjectsService } from 'src/app/core/services/projects.services';
import { ModalNavService } from 'src/app/shared/components/modal/services/modal-nav.service';
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
    // ModalComponent ➜ sustituido por ModalShellComponent
    ModalShellComponent,
    ButtonIconComponent,
    ReactiveFormsModule,
    InputSearchComponent,
    FiltersComponent,
    MatTabsModule,
    SpinnerLoadingComponent,
    TableComponent,
    ModalShowSubsidyComponent,
    MatMenuModule,
    MatCheckboxModule,
    IconActionComponent,
    StickyZoneComponent,
    ColumnMenuComponent,
  ],
  providers: [SubsidiesService],
  templateUrl: './subsidies-page.component.html',
  styleUrl: './subsidies-page.component.css',
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

  // Signals para columnas
  columnVisSig!: WritableSignal<Record<string, boolean>>;
  displayedColumnsSig!: Signal<string[]>;

  activeTabKey: string | null = null;
  makeKey(s: SubsidyModelFullData) {
    return `${s.name}__${s.year}`;
  }

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

  // Estado de UI y datos
  typeSection = TypeList;
  typePage: TypeList = TypeList.Subsidies;
  typeModal: TypeList = TypeList.Subsidies;
  currentModalAction: TypeActionModal = TypeActionModal.Create;

  selectedFilter: number | null = null;
  selectedIndex = 0;
  isModalVisible = false;
  showAllSubsidies = false;
  number = 0;

  item: ModalItem = null;
  currentYear = this.generalService.currentYear;

  subsidies: SubsidyModelFullData[] = [];
  filteredSubsidies: SubsidyModelFullData[] = [];
  filters: Filter[] = [];
  filteredSubsidiesByType: { [key: string]: SubsidyModelFullData[] } = {};
  visibleTabs: { label: string; item: SubsidyModelFullData }[] = [];
  groupedByYear: Record<string, SubsidyModelFullData[]> = {};

  @ViewChild('printArea', { static: false })
  printArea!: ElementRef<HTMLElement>;

  ngOnInit(): void {
    // Persistencia de columnas con signals
    this.columnVisSig = this.colStore.init(
      'subsidies-table',
      this.headerListSubsidies,
      ['date_justification', 'start', 'url_presentation', 'url_justification']
    );
    this.displayedColumnsSig = computed(() =>
      this.colStore.displayedColumns(
        this.headerListSubsidies,
        this.columnVisSig()
      )
    );

    // Eventos de guardado/borrado
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

    // Filtros
    this.filters = [
      { code: '', name: 'Histórico' },
      ...this.generalService.getYearFilters(2018, this.currentYear),
    ];

    // Visibilidad modal
    this.modalService.modalVisibility$
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((isVisible) => (this.isModalVisible = isVisible));

    // Estado desde facade
    this.subsidiesFacade.filteredSubsidies$
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((subs) => this.updateSubsidyState(subs));

    // Carga inicial
    this.filterSelected('');
  }

  filterSelected(filter: string): void {
    this.selectedFilter = filter === '' ? null : Number(filter);
    this.visibleTabs = [];

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

  classifySubsidies(subsidies: SubsidyModelFullData[]): void {
    this.filteredSubsidiesByType = {};
    this.visibleTabs = [];

    categoryFilterSubsidies.forEach(
      (f) => (this.filteredSubsidiesByType[f.code] = [])
    );
    subsidies.forEach((s) => {
      const code = s.name;
      if (this.filteredSubsidiesByType[code])
        this.filteredSubsidiesByType[code].push(s);
    });

    this.visibleTabs = categoryFilterSubsidies
      .map((f) => {
        const items = this.filteredSubsidiesByType[f.code];
        return items.length > 0
          ? { label: 'Sub. ' + f.name, item: items[0] }
          : null;
      })
      .filter(
        (t): t is { label: string; item: SubsidyModelFullData } => t !== null
      );
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

  private afterProjectChanged() {
    this.onCloseModal();
    if (!this.showAllSubsidies) this.reloadActiveTab();
    const year = this.selectedFilter ?? this.currentYear;
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
    this.typeModal = typeModal;
    this.item = item;

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
    this.item = null; // evitar arrastrar estado entre aperturas
  }
  // 🔎 Abrir PROYECTO desde la modal actual (pasas el id)
  onOpenProject(projectId: number): void {
    // Guarda el estado actual para poder volver
    this.modalNav.push({
      typeModal: this.typeModal,
      action: this.currentModalAction,
      item: this.item,
    });

    this.projectsService
      .getProjectById(projectId)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (project: ProjectModelFullData) => {
          this.openModal(TypeList.Projects, TypeActionModal.Show, project);
        },
        error: (err) => console.error('Error cargando proyecto', err),
      });
  }

  // 💶 Abrir INVOICE desde la modal actual (pasas el id)
  onOpenInvoice(invoiceId: number): void {
    // Guarda el estado actual para poder volver
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

  get canGoBack(): boolean {
    return this.modalNav.canGoBack();
  }

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

  private reloadActiveTab(): void {
    const current = this.visibleTabs[this.selectedIndex];
    this.activeTabKey = current
      ? this.makeKey(current.item)
      : this.activeTabKey;
    const selected = this.tabSubsidies.toArray()[this.selectedIndex];
    selected?.load();
  }

  sendFormSubsidy(event: { itemId: number; formData: FormData }): void {
    const req$ = event.itemId
      ? this.subsidiesFacade.editSubsidy(event.formData)
      : this.subsidiesFacade.addSubsidy(event.formData);
    req$.pipe(take(1)).subscribe(); // los streams saved$/deleted$ refrescan
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

  // Columnas (vía store)
  getVisibleColumns() {
    return this.colStore.visibleColumnModels(
      this.headerListSubsidies,
      this.columnVisSig()
    );
  }
  toggleColumn(key: string): void {
    this.colStore.toggle('subsidies-table', this.columnVisSig, key);
  }

  private buildGroupsByYear(list: SubsidyModelFullData[]) {
    const groups: Record<number, SubsidyModelFullData[]> = {};
    for (const s of list) {
      const y = Number(s.year);
      if (!groups[y]) groups[y] = [];
      groups[y].push(s);
    }
    this.groupedByYear = groups as any;
  }

  sortYearsDesc(
    a: KeyValue<string, SubsidyModelFullData[]>,
    b: KeyValue<string, SubsidyModelFullData[]>
  ) {
    return Number(b.key) - Number(a.key);
  }

  private updateSubsidyState(subsidies: SubsidyModelFullData[] | null): void {
    if (!subsidies) return;

    const enriched = subsidies.map((sub) => ({
      ...sub,
      nameSubsidy: sub.name,
    }));
    this.subsidies = this.subsidiesService.sortSubsidiesByYear(enriched);
    this.filteredSubsidies = [...this.subsidies];
    this.number = this.subsidiesService.countSubsidies(enriched);

    this.buildGroupsByYear(this.filteredSubsidies);
    this.classifySubsidies(this.subsidies);

    if (!this.showAllSubsidies && this.visibleTabs.length > 0) {
      if (this.activeTabKey) {
        const idx = this.visibleTabs.findIndex(
          (t) => this.makeKey(t.item) === this.activeTabKey
        );
        this.selectedIndex =
          idx >= 0
            ? idx
            : Math.min(this.selectedIndex, this.visibleTabs.length - 1);
      } else {
        this.selectedIndex = Math.min(
          this.selectedIndex,
          this.visibleTabs.length - 1
        );
      }
    } else {
      this.selectedIndex = 0;
    }
  }
}
