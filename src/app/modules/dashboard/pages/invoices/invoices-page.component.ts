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
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatMenuModule } from '@angular/material/menu';
import { MatTabChangeEvent, MatTabsModule } from '@angular/material/tabs';
import { combineLatest, tap } from 'rxjs';

import { InvoicesFacade } from 'src/app/application/invoices.facade';
import {
  ColumnModel,
  ColumnWidth,
} from 'src/app/core/interfaces/column.interface';
import { InvoiceModelFullData } from 'src/app/core/interfaces/invoice.interface';
import {
  Filter,
  TypeActionModal,
  TypeList,
} from 'src/app/core/models/general.model';
import { InvoicesService } from 'src/app/core/services/invoices.services';

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

@Component({
  selector: 'app-invoices-page',
  standalone: true,
  imports: [
    CommonModule,
    DashboardHeaderComponent,
    // ModalComponent ➜ sustituido por ModalShellComponent
    ModalShellComponent,
    ButtonIconComponent,
    InputSearchComponent,
    SpinnerLoadingComponent,
    TableComponent,
    FiltersComponent,
    MatTabsModule,
    IconActionComponent,
    MatMenuModule,
    MatCheckboxModule,
    StickyZoneComponent,
    ColumnMenuComponent,
  ],
  templateUrl: './invoices-page.component.html',
})
export class InvoicesPageComponent implements OnInit {
  private readonly destroyRef = inject(DestroyRef);
  private readonly modalService = inject(ModalService);
  readonly invoicesFacade = inject(InvoicesFacade);
  private readonly invoicesService = inject(InvoicesService);
  private readonly generalService = inject(GeneralService);
  private readonly pdfPrintService = inject(PdfPrintService);
  private readonly colStore = inject(ColumnVisibilityStore);

  // ── Tabla
  headerListInvoices: ColumnModel[] = [
    {
      title: 'FACT.',
      key: 'invoice_pdf',
      sortable: true,
      showIndicatorOnEmpty: true,
      textAlign: 'center',
    },
    {
      title: 'JUST.',
      key: 'proof_pdf',
      sortable: true,
      showIndicatorOnEmpty: true,
      textAlign: 'center',
    },
    {
      title: 'Tipo',
      key: 'type_invoice',
      sortable: true,
      width: ColumnWidth.XS,
      textAlign: 'center',
    },
    {
      title: 'Nº Factura',
      key: 'number_invoice',
      width: ColumnWidth.XS,
      showIndicatorOnEmpty: true,
      textAlign: 'center',
    },
    {
      title: 'Fecha factura',
      key: 'date_invoice',
      sortable: true,
      width: ColumnWidth.XS,
      pipe: 'date : dd MMM yyyy',
      textAlign: 'center',
    },
    {
      title: 'Fecha cuentas',
      key: 'date_accounting',
      sortable: true,
      width: ColumnWidth.XS,
      pipe: 'date : dd MMM yyyy',
      showIndicatorOnEmpty: true,
      textAlign: 'center',
    },
    {
      title: 'Fecha pago',
      key: 'date_payment',
      sortable: true,
      width: ColumnWidth.XS,
      pipe: 'date : dd MMM yyyy',
      showIndicatorOnEmpty: true,
      textAlign: 'center',
    },
    { title: 'Acreedor', key: 'creditor_company', sortable: true },
    {
      title: 'Descripción',
      key: 'description',
      sortable: true,
      innerHTML: true,
      showIndicatorOnEmpty: true,
      width: ColumnWidth.LG,
    },
    {
      title: 'Cantidad',
      key: 'amount',
      sortable: true,
      width: ColumnWidth.XS,
      pipe: 'eurosFormat',
      footerTotal: true,
      textAlign: 'right',
    },
    {
      title: 'IVA',
      key: 'iva',
      sortable: true,
      width: ColumnWidth.XS,
      pipe: 'eurosFormat',
      textAlign: 'right',
    },
    {
      title: 'IRPF',
      key: 'irpf',
      sortable: true,
      width: ColumnWidth.XS,
      pipe: 'eurosFormat',
      footerTotal: true,
      textAlign: 'right',
    },
    {
      title: 'TOTAL',
      key: 'total_amount',
      sortable: true,
      width: ColumnWidth.XS,
      pipe: 'eurosFormat',
      footerTotal: true,
      textAlign: 'right',
    },
    {
      title: 'TOTAL+IRPF',
      key: 'total_amount_irpf',
      sortable: true,
      width: ColumnWidth.XS,
      pipe: 'eurosFormat',
      footerTotal: true,
      textAlign: 'right',
    },
    {
      title: 'Subvención',
      key: 'subsidy_name',
      sortable: true,
      width: ColumnWidth.XS,
      showIndicatorOnEmpty: true,
    },
    {
      title: 'Proyecto',
      key: 'project_title',
      sortable: true,
      backColor: true,
      width: ColumnWidth.MD,
      showIndicatorOnEmpty: true,
    },
  ];

  // ✅ Signals para visibilidad columnas
  columnVisSig!: WritableSignal<Record<string, boolean>>;
  displayedColumnsSig!: Signal<string[]>;

  // ── Datos
  invoices: InvoiceModelFullData[] = [];
  filteredInvoices: InvoiceModelFullData[] = [];
  filters: Filter[] = [];
  selectedFilter: number | null = null;

  isModalVisible = false;
  hasInvoicesForYear = false;
  number = 0;

  // Modal
  item: InvoiceModelFullData | null = null;
  currentModalAction: TypeActionModal = TypeActionModal.Create;
  typeModal = TypeList.Invoices;
  typeSection = TypeList.Invoices;

  // Tabs / filtros
  currentFilterType: string | null = null;
  currentTab: string | null = null;
  selectedIndex = 0;
  currentYear = this.generalService.currentYear;

  @ViewChild(InputSearchComponent)
  private inputSearchComponent!: InputSearchComponent;

  @ViewChild('printArea', { static: false })
  printArea!: ElementRef<HTMLElement>;

  ngOnInit(): void {
    // 1) Persistencia de columnas con signals
    this.columnVisSig = this.colStore.init(
      'invoices-table',
      this.headerListInvoices,
      ['date_payment', 'date_accounting'] // ocultas por defecto
    );
    this.displayedColumnsSig = computed(() =>
      this.colStore.displayedColumns(
        this.headerListInvoices,
        this.columnVisSig()
      )
    );

    // 2) Estado + filtros
    this.invoicesFacade.clearInvoices();
    this.filters = this.generalService.getYearFilters(2018, this.currentYear);

    combineLatest([
      this.invoicesFacade.invoices$,
      this.invoicesFacade.currentFilter$,
      this.invoicesFacade.tabFilter$,
      this.invoicesFacade.isLoading$,
    ])
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        tap(([invoices, selectedYear, tabFilter, loading]) => {
          if (loading) return;

          let invoicesForYear = invoices ?? [];
          if (selectedYear) {
            invoicesForYear = invoicesForYear.filter((inv) =>
              inv.date_invoice
                ? new Date(inv.date_invoice).getFullYear().toString() ===
                  selectedYear
                : false
            );
          }

          this.hasInvoicesForYear = invoicesForYear.length > 0;

          let filtered = invoicesForYear;
          if (tabFilter) {
            filtered = invoicesForYear.filter(
              (inv) => inv.type_invoice === tabFilter
            );
          }

          this.invoices = invoicesForYear;
          this.filteredInvoices = filtered;
          this.number = filtered.length;
        })
      )
      .subscribe();

    // 3) Visibilidad modal
    this.modalService.modalVisibility$
      .pipe(takeUntilDestroyed(this.destroyRef))
      .pipe(tap((isVisible) => (this.isModalVisible = isVisible)))
      .subscribe();

    // 4) Carga inicial
    this.filterSelected(this.currentYear.toString());
  }

  // ── Filtros / tabs / búsqueda
  filterSelected(filter: string): void {
    const year = parseInt(filter, 10);
    this.selectedFilter = year;

    this.generalService.clearSearchInput(this.inputSearchComponent);

    this.selectedIndex = 0;
    this.currentTab = 'Contabilidad completa';
    this.currentFilterType = null;
    this.invoicesFacade.clearTabFilter();

    this.invoicesFacade.setCurrentFilter(year);
    this.invoicesFacade.loadInvoicesByYear(year);
  }

  tabActive(event: MatTabChangeEvent): void {
    this.currentTab = event.tab.textLabel;

    switch (this.currentTab) {
      case 'Facturas':
        this.currentFilterType = 'INVOICE';
        break;
      case 'Tickets':
        this.currentFilterType = 'TICKET';
        break;
      case 'Ingresos':
        this.currentFilterType = 'INCOME';
        break;
      default:
        this.currentFilterType = null; // Contabilidad completa
        break;
    }
    this.invoicesFacade.setTabFilter(this.currentFilterType);
  }

  applyFilterWord(keyword: string): void {
    this.invoicesFacade.applyFilterWord(keyword);
  }

  clearFilter(): void {
    this.invoicesFacade.clearTabFilter();
  }

  // ── Modal
  addNewInvoiceModal(): void {
    this.openModal(TypeList.Invoices, TypeActionModal.Create, null);
  }

  onOpenModal(event: {
    typeModal: TypeList;
    action: TypeActionModal;
    item?: InvoiceModelFullData;
  }): void {
    this.openModal(event.typeModal, event.action, event.item ?? null);
  }

  private openModal(
    typeModal: TypeList,
    action: TypeActionModal,
    item: InvoiceModelFullData | null
  ): void {
    this.currentModalAction = action;
    this.typeModal = typeModal;
    this.item = item;

    // ⚠️ Limpiar seleccionado SOLO en CREATE (no en show/edit)
    if (typeModal === TypeList.Invoices && action === TypeActionModal.Create) {
      this.invoicesFacade.clearSelectedInvoice();
    }

    this.modalService.openModal();
  }

  onCloseModal(): void {
    this.modalService.closeModal();
    this.item = null; // evitar arrastrar estado
  }

  // ── CRUD
  onDelete({ type, id }: { type: TypeList; id: number }) {
    const actions: Partial<Record<TypeList, (id: number) => void>> = {
      [TypeList.Invoices]: (x) => this.invoicesFacade.deleteInvoice(x),
    };
    actions[type]?.(id);
  }

  sendFormInvoice(event: { itemId: number; formData: FormData }): void {
    const op$ = event.itemId
      ? this.invoicesFacade.editInvoice(event.formData)
      : this.invoicesFacade.addInvoice(event.formData);

    op$
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        tap(() => {
          this.filterSelected(
            (this.selectedFilter ?? this.currentYear).toString()
          );
          this.onCloseModal();
        })
      )
      .subscribe();
  }

  // ── Impresión / descargas
  async printTableAsPdf(): Promise<void> {
    if (!this.printArea) return;
    await this.pdfPrintService.printElementAsPdf(this.printArea, {
      filename: 'facturas.pdf',
      preset: 'compact',
      orientation: 'landscape',
      format: 'a4',
      margins: [5, 5, 5, 5],
    });
  }

  downloadFilteredPdfs(includeProof: boolean = true): void {
    const data = this.filteredInvoices || [];
    this.invoicesService
      .downloadInvoicesZipFromData(data, {
        includeProof,
        filename: includeProof ? 'facturas_justificantes.zip' : 'facturas.zip',
      })
      .subscribe({
        error: (e) => {
          if (e?.message === 'NO_FILES') {
            alert('No hay PDFs para descargar.');
          } else {
            console.error('💥 Error al descargar ZIP:', e);
            alert('Error al descargar el ZIP. Revisa la consola.');
          }
        },
      });
  }

  // ── Columnas (vía store)
  getVisibleColumns() {
    return this.colStore.visibleColumnModels(
      this.headerListInvoices,
      this.columnVisSig()
    );
  }

  toggleColumn(key: string): void {
    this.colStore.toggle('invoices-table', this.columnVisSig, key);
  }
}
