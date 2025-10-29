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
import {
  takeUntilDestroyed,
  toObservable,
  toSignal,
} from '@angular/core/rxjs-interop';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatMenuModule } from '@angular/material/menu';
import { MatTabChangeEvent, MatTabsModule } from '@angular/material/tabs';
import { combineLatest, map, tap } from 'rxjs';

import { InvoicesFacade } from 'src/app/application/invoices.facade';
import { ModalFacade } from 'src/app/application/modal.facade';

import {
  ColumnModel,
  ColumnWidth,
} from 'src/app/core/interfaces/column.interface';
import { InvoiceModelFullData } from 'src/app/core/interfaces/invoice.interface';
import { TypeActionModal, TypeList } from 'src/app/core/models/general.model';
import { GeneralService } from 'src/app/core/services/generalService.service';
import { InvoicesService } from 'src/app/core/services/invoices.services';
import { PdfPrintService } from 'src/app/core/services/PdfPrintService.service';

import { IconActionComponent } from 'src/app/shared/components/buttons/icon-action/icon-action.component';
import { DashboardHeaderComponent } from 'src/app/shared/components/dashboard-header/dashboard-header.component';
import { FiltersComponent } from 'src/app/shared/components/filters/filters.component';
import { ModalShellComponent } from 'src/app/shared/components/modal/modal-shell.component';
import { PageToolbarComponent } from 'src/app/shared/components/page-toolbar/page-toolbar.component';
import { SpinnerLoadingComponent } from 'src/app/shared/components/spinner-loading/spinner-loading.component';
import { StickyZoneComponent } from 'src/app/shared/components/sticky-zone/sticky-zone.component';
import { TableComponent } from 'src/app/shared/components/table/table.component';

import { FiltersFacade } from 'src/app/application/filters.facade';
import { useColumnVisibility } from 'src/app/shared/hooks/use-column-visibility';
import { useEntityList } from 'src/app/shared/hooks/use-entity-list';

@Component({
  selector: 'app-invoices-page',
  standalone: true,
  imports: [
    CommonModule,
    DashboardHeaderComponent,
    StickyZoneComponent,
    SpinnerLoadingComponent,
    TableComponent,
    FiltersComponent,
    ModalShellComponent,
    PageToolbarComponent,
    IconActionComponent,
    MatTabsModule,
    MatMenuModule,
    MatCheckboxModule,
  ],
  templateUrl: './invoices-page.component.html',
})
export class InvoicesPageComponent implements OnInit {
  private readonly destroyRef = inject(DestroyRef);
  private readonly invoicesService = inject(InvoicesService);
  private readonly generalService = inject(GeneralService);
  private readonly pdfPrintService = inject(PdfPrintService);
  readonly invoicesFacade = inject(InvoicesFacade);
  private readonly modalFacade = inject(ModalFacade);
  readonly filtersFacade = inject(FiltersFacade);

  @ViewChild(PageToolbarComponent)
  private toolbarComponent!: PageToolbarComponent;

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
    {
      title: 'Acreedor',
      key: 'creditor_company',
      sortable: true,
      showIndicatorOnEmpty: true,
      width: ColumnWidth.XL,
    },
    {
      title: 'Concepto',
      key: 'concept',
      sortable: true,
      showIndicatorOnEmpty: true,
      width: ColumnWidth.SM,
    },
    {
      title: 'Descripción',
      key: 'description',
      sortable: true,
      innerHTML: true,
      booleanIndicator: true,
      width: ColumnWidth.SM,
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

  readonly col = useColumnVisibility(
    'invoices-table',
    this.headerListInvoices,
    ['date_payment', 'date_accounting', 'description']
  );

  // ──────────────────────────────────────────────────────────────────────────────
  // Lista / filtros / pestañas
  // ──────────────────────────────────────────────────────────────────────────────
  readonly currentYear = this.generalService.currentYear;

  private readonly byYear$ = combineLatest([
    this.invoicesFacade.invoices$,
    toObservable(this.filtersFacade.selectedSig),
  ]).pipe(
    map(([invoices, selected]) => {
      const list = invoices ?? [];
      const selectedYear = selected != null ? String(selected) : '';

      if (!selectedYear) return list;

      return list.filter((inv: InvoiceModelFullData) => {
        if (!inv.date_invoice) return false;
        const y = new Date(inv.date_invoice).getFullYear().toString();
        return y === selectedYear;
      });
    })
  );

  private readonly filtered$ = combineLatest([
    this.byYear$,
    this.invoicesFacade.tabFilter$,
    toObservable(this.filtersFacade.searchSig),
  ]).pipe(
    map(([byYear, tab, search]) => {
      const normalizedSearch = (search ?? '').trim().toLowerCase();

      let list = tab
        ? byYear.filter((inv) => inv.type_invoice === tab)
        : byYear;

      if (normalizedSearch) {
        list = list.filter((inv) => {
          const fields = [
            inv.concept,
            inv.description,
            inv.creditor_company,
            inv.project_title,
            inv.subsidy_name,
          ];

          return fields.some((v) =>
            v?.toString().toLowerCase().includes(normalizedSearch)
          );
        });
      }

      return list;
    })
  );

  readonly list = useEntityList<InvoiceModelFullData>({
    filtered$: this.filtered$,
    sort: (arr) => arr,
    count: (arr) => arr.length,
  });
  // Lista por año como Signal (sin filtro de tipo)
  private readonly byYearSig = toSignal(this.byYear$, {
    initialValue: [] as InvoiceModelFullData[],
  });

  // No hay nada en el año seleccionado
  readonly noDataYearSig = computed(() => this.byYearSig().length === 0);

  // No hay facturas/tickets/ingresos en el año seleccionado (independiente del tab activo)
  readonly noDataInvoicesSig = computed(() =>
    this.byYearSig().every((inv) => inv.type_invoice !== 'INVOICE')
  );
  readonly noDataTicketsSig = computed(() =>
    this.byYearSig().every((inv) => inv.type_invoice !== 'TICKET')
  );
  readonly noDataIncomesSig = computed(() =>
    this.byYearSig().every((inv) => inv.type_invoice !== 'INCOME')
  );

  readonly TypeList = TypeList;
  readonly hasInvoicesForYearSig = computed(() => this.list.countSig() > 0);

  // ──────────────────────────────────────────────────────────────────────────────
  // Modal (basado en ModalFacade)
  // ──────────────────────────────────────────────────────────────────────────────
  readonly modalVisibleSig = this.modalFacade.isVisibleSig;
  readonly currentModalTypeSig = this.modalFacade.typeSig;
  readonly currentModalActionSig = this.modalFacade.actionSig;
  readonly currentItemSig = this.modalFacade.itemSig;

  // ──────────────────────────────────────────────────────────────────────────────
  // Tabs
  // ──────────────────────────────────────────────────────────────────────────────
  currentFilterType: 'INVOICE' | 'TICKET' | 'INCOME' | null = null;
  selectedIndex = 0;

  @ViewChild('printArea', { static: false })
  printArea!: ElementRef<HTMLElement>;

  // ──────────────────────────────────────────────────────────────────────────────
  // Lifecycle
  // ──────────────────────────────────────────────────────────────────────────────
  ngOnInit(): void {
    this.invoicesFacade.clearInvoices();
    // Carga de filtros de años gestionados por la fachada
    this.filtersFacade.loadFiltersFor(TypeList.Invoices, '', 2018);
  }

  ngAfterViewInit(): void {
    // Selección inicial del año actual y carga de datos
    setTimeout(() => this.filterSelected(this.currentYear.toString()));
  }

  // ──────────────────────────────────────────────────────────────────────────────
  // Filtros / tabs / búsqueda
  // ──────────────────────────────────────────────────────────────────────────────
  filterSelected(filter: string): void {
    if (this.toolbarComponent) {
      this.toolbarComponent.clearSearch();
    }
    this.filtersFacade.setSearch('');
    this.selectedIndex = 0;
    this.currentFilterType = null;
    this.invoicesFacade.clearTabFilter();

    this.filtersFacade.selectFilter(filter);
    this.invoicesFacade.loadInvoicesByYear(Number(filter));
  }

  tabActive(event: MatTabChangeEvent): void {
    if (this.toolbarComponent) {
      this.toolbarComponent.clearSearch();
    }
    this.filtersFacade.setSearch('');
    const label = event.tab.textLabel;
    switch (label) {
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
        this.currentFilterType = null;
    }
    this.invoicesFacade.setTabFilter(this.currentFilterType);
  }

  applyFilterWord(keyword: string): void {
    this.filtersFacade.setSearch(keyword);
    this.invoicesFacade.applyFilterWord(keyword);
  }

  // ──────────────────────────────────────────────────────────────────────────────
  // Modal + CRUD
  // ──────────────────────────────────────────────────────────────────────────────
  addNewInvoiceModal(): void {
    this.invoicesFacade.clearSelectedInvoice();
    this.modalFacade.open(TypeList.Invoices, TypeActionModal.Create, null);
  }

  onOpenModal(event: {
    typeModal: TypeList;
    action: TypeActionModal;
    item?: InvoiceModelFullData;
  }): void {
    this.modalFacade.open(event.typeModal, event.action, event.item ?? null);
  }

  onCloseModal(): void {
    this.modalFacade.close();
  }

  onDelete({ type, id }: { type: TypeList; id: number }) {
    if (type === TypeList.Invoices) {
      this.invoicesFacade.deleteInvoice(id);
    }
  }

  sendFormInvoice(event: { itemId: number; formData: FormData }): void {
    const op$ = event.itemId
      ? this.invoicesFacade.editInvoice(event.formData)
      : this.invoicesFacade.addInvoice(event.formData);

    op$
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        tap(() => {
          // Reaplica el filtro seleccionado actual (o año en curso si no hay)
          const selected =
            this.filtersFacade.selectedSig() || this.currentYear.toString();
          this.filterSelected(String(selected));
          this.modalFacade.close();
        })
      )
      .subscribe();
  }

  // ──────────────────────────────────────────────────────────────────────────────
  // Impresión / descargas
  // ──────────────────────────────────────────────────────────────────────────────
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
    const data = this.list.processedSig() || [];
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
}
