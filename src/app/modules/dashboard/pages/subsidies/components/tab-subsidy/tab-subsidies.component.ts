import { CommonModule } from '@angular/common';
import {
  Component,
  DestroyRef,
  ElementRef,
  EventEmitter,
  Input,
  OnChanges,
  OnInit,
  Output,
  Signal,
  SimpleChanges,
  ViewChild,
  WritableSignal,
  computed,
  inject,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { MatIconModule } from '@angular/material/icon';
import { catchError, of, tap } from 'rxjs';
import { InvoicesFacade } from 'src/app/application/invoices.facade';

import {
  ColumnModel,
  ColumnWidth,
} from 'src/app/core/interfaces/column.interface';
import { InvoiceModelFullData } from 'src/app/core/interfaces/invoice.interface';
import { ProjectModelFullData } from 'src/app/core/interfaces/project.interface';
import {
  MOVEMENT_LABELS,
  SUBSIDY_NAME_LABELS,
  SubsidyModelFullData,
} from 'src/app/core/interfaces/subsidy.interface';
import { TypeActionModal, TypeList } from 'src/app/core/models/general.model';

import {
  ActionBarComponent,
  ActionItem,
  ActionPayload,
} from 'src/app/shared/components/action-bar/action-bar.component';
import { ButtonIconComponent } from 'src/app/shared/components/buttons/button-icon/button-icon.component';
import { IconActionComponent } from 'src/app/shared/components/buttons/icon-action/icon-action.component';
import { PdfPrintComponent } from 'src/app/shared/components/pdf-print/pdf-print.component';
import { ColumnVisibilityStore } from 'src/app/shared/components/table/column-visibility.store';
import { TableComponent } from 'src/app/shared/components/table/table.component';
import { TextEditorComponent } from 'src/app/shared/components/text/text-editor/text-editor.component';
import { EurosFormatPipe } from 'src/app/shared/pipe/eurosFormat.pipe';

@Component({
  selector: 'app-tab-subsidy',
  standalone: true,
  imports: [
    CommonModule,
    TextEditorComponent,
    MatIconModule,
    IconActionComponent,
    EurosFormatPipe,
    TableComponent,
    ButtonIconComponent,
    PdfPrintComponent,
    ActionBarComponent,
  ],
  templateUrl: './tab-subsidies.component.html',
  styleUrls: ['./tab-subsidies.component.css'],
})
export class TabSubsidyComponent implements OnChanges, OnInit {
  private invoicesFacade = inject(InvoicesFacade);
  private destroyRef = inject(DestroyRef);
  private readonly colStore = inject(ColumnVisibilityStore);

  @ViewChild('pdfArea', { static: false }) pdfArea!: ElementRef<HTMLElement>;

  @Input() item!: SubsidyModelFullData;
  @Input() loadInvoices: boolean = false;
  @Output() openModal = new EventEmitter<{
    typePage?: TypeList;
    typeModal: TypeList;
    action: TypeActionModal;
    item: any;
  }>();

  // Signals columnas
  columnVisSig!: WritableSignal<Record<string, boolean>>;
  displayedColumnsSig!: Signal<string[]>;

  filteredInvoices: InvoiceModelFullData[] = [];
  number_invoices = 0;
  loading = true;

  readonly TypeList = TypeList;
  readonly TypeActionModal = TypeActionModal;
  typeModal: TypeList = TypeList.Subsidies;

  nameMovement = MOVEMENT_LABELS;
  nameSubsidy = SUBSIDY_NAME_LABELS;

  private previousKey: string | null = null;

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
      footerTotal: true,
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

  ngOnInit(): void {
    this.initColumnSignals('subsidy-invoices:default');
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['item']) {
      const newItem = changes['item'].currentValue as SubsidyModelFullData;
      const key = `${newItem?.name}_${newItem?.year}`;

      if (
        key &&
        key !== this.previousKey &&
        newItem?.name &&
        newItem?.year &&
        newItem.name.trim() !== '' &&
        newItem.year !== 0
      ) {
        this.previousKey = key;
        this.initColumnSignals(
          `subsidy-invoices:${newItem.name}_${newItem.year}`
        );
        this.loadInvoicesBySubsidy();
      }
    }
  }

  private initColumnSignals(key: string) {
    this.columnVisSig = this.colStore.init(key, this.headerListInvoices, [
      'date_payment',
      'date_accounting',
    ]);
    this.displayedColumnsSig = computed(() =>
      this.colStore.displayedColumns(
        this.headerListInvoices,
        this.columnVisSig()
      )
    );
  }

  private toNumber(value: any): number {
    if (value == null || value === '') return 0;
    if (typeof value === 'number' && isFinite(value)) return value;
    const s = String(value)
      .trim()
      .replace(/[\s€]/g, '')
      .replace(/\.(?=\d{3}(?:[.,]|$))/g, '')
      .replace(/,(?=\d{2}(?:\D|$))/g, '.');
    const n = Number(s);
    return isFinite(n) ? n : 0;
  }

  /** Usa la FACADE para cargar facturas filtradas por subvención/año */
  loadInvoicesBySubsidy(): void {
    if (!this.item?.name || !this.item?.year) return;
    this.loading = true;

    this.invoicesFacade.loadInvoicesBySubsidy(this.item.name, this.item.year);

    this.invoicesFacade.filteredInvoices$
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        tap((invoices: InvoiceModelFullData[] | null) => {
          this.filteredInvoices = (invoices ?? []).map((inv) => ({
            ...inv,
            amount: this.toNumber(inv.amount),
            iva: this.toNumber(inv.iva),
            irpf: this.toNumber(inv.irpf),
            total_amount: this.toNumber(inv.total_amount),
          }));
          this.number_invoices = this.filteredInvoices.length;
          this.loading = false;
        }),
        catchError((err) => {
          console.error('Error cargando facturas', err);
          this.loading = false;
          return of([]);
        })
      )
      .subscribe();
  }

  getProjectTotalBudget(project: ProjectModelFullData): number {
    return (
      project.activities?.reduce((total, act) => {
        const budget = parseFloat(String(act.budget)) || 0;
        return total + budget;
      }, 0) || 0
    );
  }

  onOpenModal(typeModal: TypeList, action: TypeActionModal, item: any): void {
    this.openModal.emit({ typeModal, action, item });
  }

  // Columnas
  getVisibleColumns() {
    return this.colStore.visibleColumnModels(
      this.headerListInvoices,
      this.columnVisSig()
    );
  }
  toggleColumn(key: string): void {
    this.colStore.toggle(
      `subsidy-invoices:${this.previousKey ?? 'default'}`,
      this.columnVisSig,
      key
    );
  }

  /** Usa la FACADE para descargar ZIP con facturas y justificantes */
  downloadFilteredPdfs(includeProof: boolean = true): void {
    const data = this.filteredInvoices || [];
    this.invoicesFacade.downloadFilteredPdfs(data, includeProof);
  }

  readonly actionsSubsidy = [
    { icon: 'uil-eye', tooltip: 'Ver', type: 'view' },
    { icon: 'uil-edit', tooltip: 'Editar', type: 'edit' },
    { icon: 'uil-trash-alt', tooltip: 'Eliminar', type: 'remove' },
    { icon: 'uil-print', tooltip: 'Imprimir tabla', type: 'print' },
    {
      icon: 'uil-folder-download',
      tooltip: 'Descargar facturas y justificantes',
      type: 'download-pdfs',
    },
  ] satisfies ReadonlyArray<ActionItem>;

  handleSubsidyAction(ev: ActionPayload, item: any, printer: any) {
    switch (ev.type) {
      case 'view':
        this.openModal.emit({
          typeModal: this.TypeList.Subsidies,
          action: this.TypeActionModal.Show,
          item,
        });
        break;
      case 'edit':
        this.openModal.emit({
          typeModal: this.TypeList.Subsidies,
          action: this.TypeActionModal.Edit,
          item,
        });
        break;
      case 'remove':
        this.openModal.emit({
          typeModal: this.TypeList.Subsidies,
          action: this.TypeActionModal.Delete,
          item,
        });
        break;
      case 'print':
        printer?.print();
        break;
      case 'download-pdfs':
        this.downloadFilteredPdfs(true);
        break;
      default:
        return;
    }
  }
}
