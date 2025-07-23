import { CommonModule } from '@angular/common';
import {
  Component,
  DestroyRef,
  OnInit,
  ViewChild,
  inject,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
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
import { DashboardHeaderComponent } from 'src/app/modules/dashboard/components/dashboard-header/dashboard-header.component';
import { FiltersComponent } from 'src/app/modules/landing/components/filters/filters.component';
import { ButtonIconComponent } from 'src/app/shared/components/buttons/button-icon/button-icon.component';
import { InputSearchComponent } from 'src/app/shared/components/inputs/input-search/input-search.component';
import { ModalComponent } from 'src/app/shared/components/modal/modal.component';
import { ModalService } from 'src/app/shared/components/modal/services/modal.service';
import { SpinnerLoadingComponent } from 'src/app/shared/components/spinner-loading/spinner-loading.component';
import { GeneralService } from 'src/app/shared/services/generalService.service';
import { TableComponent } from '../../components/table/table.component';

@Component({
  selector: 'app-invoices-page',
  imports: [
    CommonModule,
    DashboardHeaderComponent,
    ModalComponent,
    ButtonIconComponent,
    InputSearchComponent,
    SpinnerLoadingComponent,
    TableComponent,
    FiltersComponent,
    MatTabsModule,
  ],
  templateUrl: './invoices-page.component.html',
  styleUrls: ['./invoices-page.component.css'],
})
export class InvoicesPageComponent implements OnInit {
  private readonly destroyRef = inject(DestroyRef);
  private readonly modalService = inject(ModalService);
  private readonly invoicesFacade = inject(InvoicesFacade);
  private readonly generalService = inject(GeneralService);

  headerListInvoices: ColumnModel[] = [
    {
      title: 'Factura',
      key: 'invoice_pdf',
      sortable: true,
      showIndicatorOnEmpty: true,
    },
    {
      title: 'Tipo',
      key: 'type_invoice',
      sortable: true,
      width: ColumnWidth.XS,
    },
    {
      title: 'Nº Factura',
      key: 'number_invoice',
      width: ColumnWidth.XS,
      showIndicatorOnEmpty: true,
    },
    {
      title: 'Fecha factura',
      key: 'date_invoice',
      sortable: true,
      width: ColumnWidth.XS,
      pipe: 'date : dd MMM yyyy',
    },
    {
      title: 'Fecha cuentas',
      key: 'date_accounting',
      sortable: true,
      width: ColumnWidth.XS,
      pipe: 'date : dd MMM yyyy',
      showIndicatorOnEmpty: true,
    },
    {
      title: 'Fecha pago',
      key: 'date_payment',
      sortable: true,
      width: ColumnWidth.XS,
      pipe: 'date : dd MMM yyyy',
      showIndicatorOnEmpty: true,
    },
    { title: 'Acreedor', key: 'creditor_company', sortable: true },
    {
      title: 'Descripción',
      key: 'description',
      sortable: true,
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
    },
    {
      title: 'IVA',
      key: 'iva',
      sortable: true,
      width: ColumnWidth.XS,
      pipe: 'eurosFormat',
    },
    {
      title: 'IRPF',
      key: 'irpf',
      sortable: true,
      width: ColumnWidth.XS,
      pipe: 'eurosFormat',
      footerTotal: true,
    },
    {
      title: 'TOTAL',
      key: 'total_amount',
      sortable: true,
      width: ColumnWidth.XS,
      pipe: 'eurosFormat',
      footerTotal: true,
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
      width: ColumnWidth.XS,
      showIndicatorOnEmpty: true,
    },
  ];

  invoices: InvoiceModelFullData[] = [];
  filteredInvoices: InvoiceModelFullData[] = [];
  filtersYears: Filter[] = [];
  selectedFilter: number | null = null;
  isLoading = true;
  isModalVisible = false;
  hasInvoicesForYear = false;
  number = 0;
  item: InvoiceModelFullData | null = null;
  currentModalAction: TypeActionModal = TypeActionModal.Create;
  typeSection = TypeList.Invoices;
  typeModal = TypeList.Invoices;
  currentFilterType: string | null = null;
  currentTab: string | null = null;
  currentYear = this.generalService.currentYear;
  selectedIndex = 0;

  @ViewChild(InputSearchComponent)
  private inputSearchComponent!: InputSearchComponent;

  ngOnInit(): void {
    this.invoicesFacade.clearInvoices();
    this.filtersYears = this.generalService.getYearFilters(
      2018,
      this.currentYear
    );

    combineLatest([
      this.invoicesFacade.invoices$,
      this.invoicesFacade.currentFilter$,
      this.invoicesFacade.tabFilter$,
      this.invoicesFacade.isLoading$, // AÑADIMOS EL isLoading$
    ])
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        tap(([invoices, selectedYear, tabFilter, loading]) => {
          if (loading) {
            this.isLoading = true;
            return; // 🔥 si sigue cargando, NO hacer nada más
          }

          this.isLoading = false;

          let invoicesForYear = invoices;

          if (selectedYear) {
            invoicesForYear = invoices.filter((invoice) =>
              invoice.date_invoice
                ? new Date(invoice.date_invoice).getFullYear().toString() ===
                  selectedYear
                : false
            );
          }

          this.hasInvoicesForYear = invoicesForYear.length > 0; // ✅ si hay facturas del año o no

          let filtered = invoicesForYear;

          if (tabFilter) {
            filtered = invoicesForYear.filter(
              (invoice) => invoice.type_invoice === tabFilter
            );
          }

          this.invoices = invoicesForYear;
          this.filteredInvoices = filtered;
          this.number = filtered.length;
        })
      )
      .subscribe();

    this.modalService.modalVisibility$
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        tap((isVisible) => (this.isModalVisible = isVisible))
      )
      .subscribe();

    this.filterSelected(this.currentYear.toString());
  }

  filterSelected(filter: string): void {
    const year = parseInt(filter, 10);
    this.selectedFilter = year;
    this.generalService.clearSearchInput(this.inputSearchComponent);

    this.selectedIndex = 0;
    this.currentTab = 'Contabilidad completa';
    this.currentFilterType = null;
    this.invoicesFacade.clearTabFilter();

    this.invoicesFacade.setCurrentFilter(year.toString());
    this.invoicesFacade.loadInvoicesByYear(year);
  }

  tabActive(event: MatTabChangeEvent): void {
    this.currentTab = event.tab.textLabel;

    switch (this.currentTab) {
      case 'Facturas':
        this.currentFilterType = 'Factura';
        break;
      case 'Tickets':
        this.currentFilterType = 'Ticket';
        break;
      case 'Ingresos':
        this.currentFilterType = 'Ingreso';
        break;
      case 'Contabilidad completa':
        this.currentFilterType = null;
        break;
      default:
        this.currentFilterType = null;
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

  addNewInvoiceModal(): void {
    this.currentModalAction = TypeActionModal.Create;
    this.item = null;
    this.modalService.openModal();
  }

  onOpenModal(event: {
    action: TypeActionModal;
    item: InvoiceModelFullData;
  }): void {
    this.currentModalAction = event.action;
    this.item = event.item;
    this.typeModal = TypeList.Invoices;
    this.modalService.openModal();
  }

  onCloseModal(): void {
    this.modalService.closeModal();
    this.isLoading = false;
  }

  confirmDeleteInvoice(invoice: InvoiceModelFullData | null): void {
    if (!invoice) return;
    this.invoicesFacade.deleteInvoice(invoice.id);
    this.modalService.closeModal();
  }

  sendFormInvoice(event: { itemId: number; formData: FormData }): void {
    const operation = event.itemId
      ? this.invoicesFacade.editInvoice(event.itemId, event.formData)
      : this.invoicesFacade.addInvoice(event.formData);

    operation
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
}
