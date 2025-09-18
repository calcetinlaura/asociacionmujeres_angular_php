import { CommonModule, KeyValue } from '@angular/common';
import {
  Component,
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
import { ButtonComponent } from 'src/app/shared/components/buttons/button/button.component';
import { IconActionComponent } from 'src/app/shared/components/buttons/icon-action/icon-action.component';
import { InputSearchComponent } from 'src/app/shared/components/inputs/input-search/input-search.component';
import { ModalComponent } from 'src/app/shared/components/modal/modal.component';
import { ModalService } from 'src/app/shared/components/modal/services/modal.service';
import { SpinnerLoadingComponent } from 'src/app/shared/components/spinner-loading/spinner-loading.component';
import { GeneralService } from 'src/app/shared/services/generalService.service';
import { PdfPrintService } from 'src/app/shared/services/PdfPrintService.service';
import { StickyZoneComponent } from '../../components/sticky-zone/sticky-zone.component';
import { TableComponent } from '../../components/table/table.component';
import { ModalShowSubsidyComponent } from './components/tab-subsidy/tab-subsidies.component';

@Component({
  selector: 'app-subsidies-page',
  standalone: true,
  imports: [
    DashboardHeaderComponent,
    ModalComponent,
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
    ButtonComponent,
    IconActionComponent,
    CommonModule,
    StickyZoneComponent,
  ],
  providers: [SubsidiesService],
  templateUrl: './subsidies-page.component.html',
  styleUrl: './subsidies-page.component.css',
})
export class SubsidiesPageComponent implements OnInit {
  private readonly destroyRef = inject(DestroyRef);
  private readonly modalService = inject(ModalService);
  readonly subsidiesFacade = inject(SubsidiesFacade);
  private readonly invoicesFacade = inject(InvoicesFacade);
  private readonly projectsFacade = inject(ProjectsFacade);
  private readonly subsidiesService = inject(SubsidiesService);
  private readonly generalService = inject(GeneralService);
  private readonly pdfPrintService = inject(PdfPrintService);

  // ViewChildren
  @ViewChildren(ModalShowSubsidyComponent)
  tabSubsidies!: QueryList<ModalShowSubsidyComponent>;

  columnVisibility: Record<string, boolean> = {};
  displayedColumns: string[] = [];
  activeTabKey: string | null = null;
  makeKey(s: SubsidyModelFullData) {
    return `${s.name}__${s.year}`;
  }
  headerListSubsidies: ColumnModel[] = [
    {
      title: 'Nombre',
      key: 'nameSubsidy',
      sortable: true,
    },
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

  // Estado de UI
  typeSection = TypeList;
  typePage: TypeList = TypeList.Subsidies;
  typeModal: TypeList = TypeList.Subsidies;
  currentModalAction: TypeActionModal = TypeActionModal.Create;
  selectedFilter: number | null = null;
  selectedIndex: number = 0;
  isModalVisible = false;
  showAllSubsidies = false;
  number = 0;
  item: any;
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

    // Columnas visibles iniciales
    this.columnVisibility = this.generalService.setColumnVisibility(
      this.headerListSubsidies,
      ['date_justification', 'start', 'url_presentation', 'url_justification'] // Coloca las columnas que deseas ocultar aquí
    );

    // Actualiza las columnas visibles según el estado de visibilidad
    this.displayedColumns = this.generalService.updateDisplayedColumns(
      this.headerListSubsidies,
      this.columnVisibility
    );

    this.filters = [
      { code: '', name: 'Histórico' },
      ...this.generalService.getYearFilters(2018, this.currentYear),
    ];

    this.modalService.modalVisibility$
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((isVisible) => (this.isModalVisible = isVisible));

    this.subsidiesFacade.filteredSubsidies$
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((subsidies) => this.updateSubsidyState(subsidies));

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

    categoryFilterSubsidies.forEach((filter) => {
      this.filteredSubsidiesByType[filter.code] = [];
    });

    subsidies.forEach((subsidy) => {
      const code = subsidy.name;
      if (this.filteredSubsidiesByType[code]) {
        this.filteredSubsidiesByType[code].push(subsidy);
      }
    });

    this.visibleTabs = categoryFilterSubsidies
      .map((filter) => {
        const items = this.filteredSubsidiesByType[filter.code];
        return items.length > 0
          ? { label: 'Sub. ' + filter.name, item: items[0] }
          : null;
      })
      .filter(
        (tab): tab is { label: string; item: SubsidyModelFullData } =>
          tab !== null
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

    // Si estás viendo tabs (no "Histórico"), recarga el tab actual
    if (!this.showAllSubsidies) {
      this.reloadActiveTab();
    }

    // Refresca los datos agregados de subvenciones del año seleccionado
    const year = this.selectedFilter ?? this.currentYear;
    this.subsidiesFacade.loadSubsidiesByYear(year);
  }
  private afterSubsidyChanged() {
    this.onCloseModal();
    // Si estás en “Histórico”, recarga la lista:
    if (this.showAllSubsidies) {
      this.filterSelected('');
    } else {
      // Si estás en tabs por subvención, recarga el tab activo:
      this.reloadActiveTab();
    }
  }
  private afterInvoiceChanged() {
    this.onCloseModal();

    if (this.showAllSubsidies) {
      // Refresca la tabla "Histórico"
      this.filterSelected((this.selectedFilter ?? this.currentYear).toString());
    } else {
      // Estás en tabs por subvención → recarga el tab activo
      this.reloadActiveTab();
    }
  }
  addNewSubsidyModal(): void {
    this.openModal(this.typeModal, TypeActionModal.Create, null);
  }

  onOpenModal(event: {
    typeModal: TypeList;
    action: TypeActionModal;
    item: SubsidyModel;
  }): void {
    this.openModal(event.typeModal, event.action, event.item ?? null);
  }

  private openModal(
    typeModal: TypeList,
    action: TypeActionModal,
    item: SubsidyModel | null
  ): void {
    this.currentModalAction = action;
    this.typeModal = typeModal;
    this.item = item;

    this.subsidiesFacade.clearSelectedSubsidy();
    this.modalService.openModal();
  }

  onCloseModal(): void {
    this.modalService.closeModal();
  }

  onDelete({ type, id }: { type: TypeList; id: number }) {
    const ops: Partial<Record<TypeList, (id: number) => Observable<any>>> = {
      [this.typeSection.Invoices]: (x) => {
        this.invoicesFacade.deleteInvoice(x);
        return EMPTY;
      },
      [this.typeSection.Projects]: (x) => {
        this.projectsFacade.deleteProject(x);
        return EMPTY;
      },
      [this.typeSection.Subsidies]: (x) => {
        this.subsidiesFacade.deleteSubsidy(x);
        return EMPTY;
      },
    };
    ops[type]?.(id).pipe(take(1)).subscribe(); // el refresco lo hará deleted$
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

    req$.pipe(/* take(1) si quieres */).subscribe();
  }

  sendFormProject(event: { itemId?: number; formData: FormData }) {
    const obs = event.itemId
      ? this.projectsFacade.editProject(event.formData)
      : this.projectsFacade.addProject(event.formData);

    obs.pipe(take(1)).subscribe(); // el refresco lo dispara saved$ arriba
  }

  sendFormInvoice(event: { itemId: number; formData: FormData }): void {
    const req$ = event.itemId
      ? this.invoicesFacade.editInvoice(event.formData)
      : this.invoicesFacade.addInvoice(event.formData);

    // No hace falta hacer nada en el subscribe; saved$ se encargará de refrescar/cerrar
    req$.pipe(take(1)).subscribe();
  }

  async printTableAsPdf(): Promise<void> {
    if (!this.printArea) return;

    await this.pdfPrintService.printElementAsPdf(this.printArea, {
      filename: 'subvenciones.pdf',
      preset: 'compact', // 'compact' reduce paddings en celdas
      orientation: 'landscape', // o 'landscape' si la tabla es muy ancha
      format: 'a4',
      margins: [5, 5, 5, 5], // mm
    });
  }

  getVisibleColumns() {
    return this.headerListSubsidies.filter(
      (col) => this.columnVisibility[col.key]
    );
  }

  // Método para actualizar las columnas visibles cuando se hace toggle
  toggleColumn(key: string): void {
    this.columnVisibility[key] = !this.columnVisibility[key];
    this.displayedColumns = this.generalService.updateDisplayedColumns(
      this.headerListSubsidies,
      this.columnVisibility
    );
  }

  private buildGroupsByYear(list: SubsidyModelFullData[]) {
    const groups: Record<number, SubsidyModelFullData[]> = {};
    for (const s of list) {
      const y = Number(s.year);
      if (!groups[y]) groups[y] = [];
      groups[y].push(s);
    }
    this.groupedByYear = groups;
  }

  // Comparator para ordenar los años desc en el keyvalue pipe
  sortYearsDesc(
    a: KeyValue<string, SubsidyModelFullData[]>,
    b: KeyValue<string, SubsidyModelFullData[]>
  ) {
    return Number(b.key) - Number(a.key);
  }

  private updateSubsidyState(subsidies: SubsidyModelFullData[] | null): void {
    if (!subsidies) return;

    const enrichedSubsidies = subsidies.map((sub) => ({
      ...sub,
      nameSubsidy: sub.name,
    }));

    this.subsidies =
      this.subsidiesService.sortSubsidiesByYear(enrichedSubsidies);
    this.filteredSubsidies = [...this.subsidies];
    this.number = this.subsidiesService.countSubsidies(enrichedSubsidies);

    this.buildGroupsByYear(this.filteredSubsidies);

    this.classifySubsidies(this.subsidies);
    // ⬇️ Mantén el tab activo si existe, si no, clamp al rango
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
      this.selectedIndex = 0; // solo si no hay tabs o estás en "Histórico"
    }
  }
}
