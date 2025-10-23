import { CommonModule } from '@angular/common';
import {
  Component,
  DestroyRef,
  ElementRef,
  inject,
  OnInit,
  ViewChild,
} from '@angular/core';
import { takeUntilDestroyed, toSignal } from '@angular/core/rxjs-interop';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatMenuModule } from '@angular/material/menu';
import { MatTabChangeEvent, MatTabsModule } from '@angular/material/tabs';
import { combineLatest, map, tap } from 'rxjs';

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
import { SpinnerLoadingComponent } from 'src/app/shared/components/spinner-loading/spinner-loading.component';
import { GeneralService } from 'src/app/shared/services/generalService.service';
import { PdfPrintService } from 'src/app/shared/services/PdfPrintService.service';
import { StickyZoneComponent } from '../../components/sticky-zone/sticky-zone.component';
import { TableComponent } from '../../components/table/table.component';

import { ModalShellComponent } from 'src/app/shared/components/modal/modal-shell.component';
import { ModalService } from 'src/app/shared/components/modal/services/modal.service';

// hooks reutilizables
import { useColumnVisibility } from 'src/app/shared/hooks/use-column-visibility';
import { useEntityList } from 'src/app/shared/hooks/use-entity-list';

// toolbar común

import { IconActionComponent } from 'src/app/shared/components/buttons/icon-action/icon-action.component';
import { PageToolbarComponent } from '../../components/page-toolbar/page-toolbar.component';

@Component({
  selector: 'app-invoices-page',
  standalone: true,
  imports: [
    CommonModule,
    // UI
    DashboardHeaderComponent,
    StickyZoneComponent,
    SpinnerLoadingComponent,
    TableComponent,
    FiltersComponent,
    ModalShellComponent,
    PageToolbarComponent,
    IconActionComponent,
    // Angular Material
    MatTabsModule,
    MatMenuModule,
    MatCheckboxModule,
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

  // ── Definición columnas
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

  // ── Column visibility (hook)
  readonly col = useColumnVisibility(
    'invoices-table',
    this.headerListInvoices,
    ['date_payment', 'date_accounting']
  );

  // ── Streams derivados para año y pestaña
  readonly currentYear = this.generalService.currentYear;

  private readonly byYear$ = combineLatest([
    this.invoicesFacade.invoices$,
    this.invoicesFacade.currentFilter$,
  ]).pipe(
    map(([invoices, selectedYear]) => {
      const list = invoices ?? [];
      if (!selectedYear) return list;
      return list.filter((inv) =>
        inv.date_invoice
          ? new Date(inv.date_invoice).getFullYear().toString() === selectedYear
          : false
      );
    })
  );

  // filtered$ aplicado por pestaña (tipo)
  private readonly filtered$ = combineLatest([
    this.byYear$,
    this.invoicesFacade.tabFilter$,
  ]).pipe(
    map(([byYear, tab]) => {
      if (!tab) return byYear;
      return byYear.filter((inv) => inv.type_invoice === tab);
    })
  );

  // ── Lista (hook): filtered → sort → count
  readonly list = useEntityList<InvoiceModelFullData>({
    filtered$: this.filtered$,
    sort: (arr) => arr, // si tienes un método de ordenación, cámbialo aquí
    count: (arr) => arr.length,
  });

  // ── hasInvoicesForYear (ignora pestaña)
  readonly hasInvoicesForYearSig = toSignal(
    this.byYear$.pipe(map((arr) => arr.length > 0)),
    { initialValue: false }
  );

  // ── filtros de año
  filters: Filter[] = [];
  selectedFilter: string | number = '';

  // ── modal
  readonly modalVisibleSig = toSignal(this.modalService.modalVisibility$, {
    initialValue: false,
  });
  item: InvoiceModelFullData | null = null;
  currentModalAction: TypeActionModal = TypeActionModal.Create;
  typeModal = TypeList.Invoices;
  typeSection = TypeList.Invoices;

  // ── tabs
  currentFilterType: 'INVOICE' | 'TICKET' | 'INCOME' | null = null;
  selectedIndex = 0;

  // refs
  @ViewChild('printArea', { static: false })
  printArea!: ElementRef<HTMLElement>;

  ngOnInit(): void {
    this.invoicesFacade.clearInvoices();
    this.filters = this.generalService.getYearFilters(2018, this.currentYear);
    // carga inicial
    this.selectedFilter = this.currentYear.toString();
    this.filterSelected(this.selectedFilter);
  }

  // ── Filtros / tabs / búsqueda
  filterSelected(filter: string): void {
    const year = parseInt(filter, 10);
    // reset pestaña
    this.selectedIndex = 0;
    this.currentFilterType = null;
    this.invoicesFacade.clearTabFilter();

    this.invoicesFacade.setCurrentFilter(year);
    this.invoicesFacade.loadInvoicesByYear(year);
  }

  tabActive(event: MatTabChangeEvent): void {
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
        break;
    }
    this.invoicesFacade.setTabFilter(this.currentFilterType);
  }

  applyFilterWord(keyword: string): void {
    this.invoicesFacade.applyFilterWord(keyword);
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

    if (typeModal === TypeList.Invoices && action === TypeActionModal.Create) {
      this.invoicesFacade.clearSelectedInvoice();
    }
    this.modalService.openModal();
  }

  onCloseModal(): void {
    this.modalService.closeModal();
    this.item = null;
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
