import { CommonModule } from '@angular/common';
import {
  Component,
  DestroyRef,
  inject,
  OnInit,
  ViewChild,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormGroup, ReactiveFormsModule } from '@angular/forms';
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
import { AddButtonComponent } from 'src/app/shared/components/buttons/button-add/button-add.component';
import { InputSearchComponent } from 'src/app/shared/components/inputs/input-search/input-search.component';
import { ModalComponent } from 'src/app/shared/components/modal/modal.component';
import { ModalService } from 'src/app/shared/components/modal/services/modal.service';
import { SpinnerLoadingComponent } from 'src/app/shared/components/spinner-loading/spinner-loading.component';
import { GeneralService } from 'src/app/shared/services/generalService.service';
import { TableComponent } from '../../components/table/table.component';

@Component({
  selector: 'app-invoices-page',
  standalone: true,
  imports: [
    CommonModule,
    DashboardHeaderComponent,
    ModalComponent,
    AddButtonComponent,
    ReactiveFormsModule,
    InputSearchComponent,
    SpinnerLoadingComponent,
    TableComponent,
    FiltersComponent,
    MatTabsModule,
  ],
  templateUrl: './invoices-page.component.html',
  styleUrl: './invoices-page.component.css',
})
export class InvoicesPageComponent implements OnInit {
  private readonly destroyRef = inject(DestroyRef);
  private readonly modalService = inject(ModalService);
  private readonly invoicesFacade = inject(InvoicesFacade);
  private readonly invoicesService = inject(InvoicesService);
  private readonly generalService = inject(GeneralService);

  headerListInvoices: ColumnModel[] = [
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
    {
      title: 'Acreedor',
      key: 'creditor_company',
      sortable: true,
    },
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
  number = 0;

  item: InvoiceModelFullData | null = null;
  currentModalAction: TypeActionModal = TypeActionModal.Create;
  searchForm!: FormGroup;
  typeList = TypeList.Invoices;

  selectedIndex: number = 0;
  selectedTypeFilter: string | null = null;
  currentFilterType: string | null = null;
  currentTab: string | null = null;
  // searchKeywordFilter = new FormControl();
  currentYear = this.generalService.currentYear;

  @ViewChild(InputSearchComponent)
  private inputSearchComponent!: InputSearchComponent;

  ngOnInit(): void {
    (this.filtersYears = this.generalService.getYearFilters(
      2018,
      this.currentYear
    )),
      this.loadInvoicesByYears(this.selectedFilter ?? this.currentYear);

    // combinar ambos para simplificar y evitar doble carga innecesaria. Suscribirse a los cambios en las facturas filtradas
    combineLatest([
      this.invoicesFacade.filteredInvoices$,
      this.invoicesFacade.invoices$,
    ])
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        tap(([filtered, all]) => {
          if (filtered) {
            this.filteredInvoices = filtered;
            this.number = filtered.length;
          } else if (all) {
            this.filteredInvoices = all;
            this.number = all.length;
          }
          this.isLoading = false;
        })
      )
      .subscribe();

    // Suscripción a los cambios de visibilidad del modal
    this.modalService.modalVisibility$
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        tap((isVisible) => {
          this.isModalVisible = isVisible;
        })
      )
      .subscribe();
  }

  loadInvoicesByYears(filter: number): void {
    this.invoicesFacade.loadInvoicesByYears(filter);
    this.invoicesFacade.invoices$
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        tap((invoices) => {
          this.update_invoiceState(invoices);
        })
      )
      .subscribe();
  }

  filterYearSelected(filter: string): void {
    const year = parseInt(filter, 10); // convertir a número
    this.selectedFilter = year;
    this.invoicesFacade.loadInvoicesByYears(year);
    this.invoicesFacade.invoices$
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        tap((invoices) => {
          if (invoices === null) {
            this.invoices = [];
            this.filteredInvoices = [];
            this.number = 0;
          } else {
            this.invoices = invoices;
            this.filteredInvoices = invoices;
            this.number = invoices.length;
          }
          this.isLoading = false;
        })
      )
      .subscribe();
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
        this.currentFilterType = null; // Deja el tipo de filtro en null
        break;
      default:
        this.currentFilterType = null;
        break;
    }

    if (this.currentFilterType !== null) {
      this.invoicesFacade.applyFilterWordTab(this.currentFilterType);
    } else {
      this.clearFilter();
    }
  }

  applyFilterWord(keyword: string): void {
    this.invoicesFacade.applyFilterWord(keyword);
  }

  clearFilter(): void {
    this.currentFilterType = null;
    this.filteredInvoices = this.invoices;
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
    this.openModal(event.action, event.item ?? null);
  }

  private openModal(
    action: TypeActionModal,
    invoice: InvoiceModelFullData | null
  ): void {
    this.currentModalAction = action;
    this.item = invoice;
    this.modalService.openModal();
  }
  onCloseModal(): void {
    this.modalService.closeModal();
  }

  confirmDeleteInvoice(invoice: InvoiceModelFullData | null): void {
    if (!invoice) return;
    this.invoicesFacade.deleteInvoice(invoice.id);
    this.modalService.closeModal();
  }
  sendFormInvoice(event: { itemId: number; formData: FormData }): void {
    if (event.itemId) {
      this.invoicesFacade
        .editInvoice(event.itemId, event.formData)
        .pipe(
          takeUntilDestroyed(this.destroyRef),
          tap(() => {
            this.loadInvoicesByYears(this.selectedFilter ?? this.currentYear);
            this.invoicesFacade.applyFilterWordTab(this.currentFilterType);
            this.onCloseModal(); // ✅ ahora también cierra al editar
          })
        )
        .subscribe();
    } else {
      this.invoicesFacade
        .addInvoice(event.formData)
        .pipe(
          takeUntilDestroyed(this.destroyRef),
          tap(() => {
            this.loadInvoicesByYears(this.selectedFilter ?? this.currentYear);
            this.invoicesFacade.applyFilterWordTab(this.currentFilterType);
            this.onCloseModal();
          })
        )
        .subscribe();
    }
  }

  private update_invoiceState(invoices: InvoiceModelFullData[] | null): void {
    if (!invoices) return;
    this.invoices = this.invoicesService.sortInvoicesByDate(invoices);
    this.filteredInvoices = [...this.invoices];
    this.number = this.invoicesService.countInvoices(invoices);
    this.isLoading = false;
  }
}
