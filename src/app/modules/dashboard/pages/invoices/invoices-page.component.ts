import { CommonModule } from '@angular/common';
import {
  Component,
  DestroyRef,
  OnInit,
  ViewChild,
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
    IconActionComponent,
    ButtonComponent,
    MatMenuModule,
    MatCheckboxModule,
    StickyZoneComponent,
  ],
  templateUrl: './invoices-page.component.html',
  styleUrls: ['./invoices-page.component.css'],
})
export class InvoicesPageComponent implements OnInit {
  private readonly destroyRef = inject(DestroyRef);
  private readonly modalService = inject(ModalService);
  private readonly invoicesFacade = inject(InvoicesFacade);
  private readonly invoicesService = inject(InvoicesService);
  private readonly generalService = inject(GeneralService);
  private readonly pdfPrintService = inject(PdfPrintService);
  // Para controlar qué columnas se muestran
  columnVisibility: Record<string, boolean> = {};
  displayedColumns: string[] = [];
  headerListInvoices: ColumnModel[] = [
    {
      title: 'PDF',
      key: 'invoice_pdf',
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
    // Ocultar 'date_payment' y 'date_accounting' al cargar la página
    this.columnVisibility = this.generalService.setColumnVisibility(
      this.headerListInvoices,
      ['date_payment', 'date_accounting'] // Coloca las columnas que deseas ocultar aquí
    );

    // Actualiza las columnas visibles según el estado de visibilidad
    this.displayedColumns = this.generalService.updateDisplayedColumns(
      this.headerListInvoices,
      this.columnVisibility
    );

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
    this.openModal(this.typeModal, TypeActionModal.Create, null);
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
    this.invoicesFacade.clearSelectedInvoice();
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
  printTableAsPdf(): void {
    this.pdfPrintService.printTableAsPdf('table-to-print', 'facturas.pdf');
  }

  downloadFilteredPdfs(): void {
    // Filtra los datos que tienen un PDF
    const data = this.filteredInvoices || [];

    const pdfFiles = data
      .filter((invoice: any) => invoice.invoice_pdf) // Filtra las facturas que tienen un PDF
      .map((invoice: any) => {
        const fileName = invoice.invoice_pdf;
        const yearMatch = fileName.match(/^(\d{4})_/); // Extrae el año del nombre del archivo
        const yearFolder = yearMatch ? yearMatch[1] : '';
        return `${yearFolder}/${fileName}`; // Retorna la ruta completa del archivo PDF
      });

    // Si no hay PDFs, muestra una alerta
    if (!pdfFiles.length) {
      alert('No hay PDFs para descargar.');
      return;
    }

    // Llama al servicio para descargar el archivo ZIP
    this.invoicesService.downloadFilteredPdfs(pdfFiles).subscribe({
      next: (blob) => {
        // Crea un objeto URL para el archivo Blob
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'facturas.zip'; // Nombre del archivo ZIP descargado
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        window.URL.revokeObjectURL(url); // Libera el objeto URL
      },
      error: (err) => {
        console.error('💥 Error al descargar ZIP:', err);
        alert('Error al descargar el ZIP. Revisa la consola.');
      },
    });
  }

  getVisibleColumns() {
    return this.headerListInvoices.filter(
      (col) => this.columnVisibility[col.key]
    );
  }
  // Método para actualizar las columnas visibles cuando se hace toggle
  toggleColumn(key: string): void {
    // Cambia la visibilidad de la columna en columnVisibility
    this.columnVisibility[key] = !this.columnVisibility[key];
    // Actualiza las columnas visibles en la tabla después de cambiar el estado
    this.displayedColumns = this.generalService.updateDisplayedColumns(
      this.headerListInvoices,
      this.columnVisibility
    );
  }
}
