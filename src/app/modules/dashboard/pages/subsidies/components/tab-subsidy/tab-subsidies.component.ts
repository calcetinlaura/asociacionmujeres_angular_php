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
  SimpleChanges,
  ViewChild,
  inject,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { MatIconModule } from '@angular/material/icon';
import { catchError, of, tap } from 'rxjs';
import {
  ColumnModel,
  ColumnWidth,
} from 'src/app/core/interfaces/column.interface';
import { InvoiceModelFullData } from 'src/app/core/interfaces/invoice.interface';
import { ProjectModelFullData } from 'src/app/core/interfaces/project.interface';
import { SubsidyModelFullData } from 'src/app/core/interfaces/subsidy.interface';
import { TypeActionModal, TypeList } from 'src/app/core/models/general.model';
import { InvoicesService } from 'src/app/core/services/invoices.services';
import { SubsidiesService } from 'src/app/core/services/subsidies.services';
import { PdfPrintComponent } from 'src/app/modules/dashboard/components/pdf-print/pdf-print.component';
import { IconActionComponent } from 'src/app/shared/components/buttons/icon-action/icon-action.component';
import { TextEditorComponent } from 'src/app/shared/components/text/text-editor/text-editor.component';
import { EurosFormatPipe } from 'src/app/shared/pipe/eurosFormat.pipe';
import { GeneralService } from 'src/app/shared/services/generalService.service';
import { ButtonIconComponent } from '../../../../../../shared/components/buttons/button-icon/button-icon.component';
import { TableComponent } from '../../../../components/table/table.component';

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
  ],
  templateUrl: './tab-subsidies.component.html',
  styleUrls: ['./tab-subsidies.component.css'],
})
export class ModalShowSubsidyComponent implements OnChanges, OnInit {
  private subsidiesService = inject(SubsidiesService);
  private invoicesService = inject(InvoicesService);
  private destroyRef = inject(DestroyRef);
  private readonly generalService = inject(GeneralService);
  @ViewChild('pdfArea', { static: false }) pdfArea!: ElementRef<HTMLElement>;

  @Input() item!: SubsidyModelFullData;
  @Input() loadInvoices: boolean = false;
  @Output() openModal = new EventEmitter<{
    typePage?: TypeList;
    typeModal: TypeList;
    action: TypeActionModal;
    item: any;
  }>();
  columnVisibility: Record<string, boolean> = {};
  displayedColumns: string[] = [];
  itemInvoice?: InvoiceModelFullData;
  typeList = TypeList;
  typeModal: TypeList = TypeList.Subsidies;
  filteredInvoices: InvoiceModelFullData[] = [];
  number_invoices: number = 0;
  currentModalAction: TypeActionModal = TypeActionModal.Create;
  loading = true;
  amount_association = 0;
  nameMovement = this.subsidiesService.movementMap;
  nameSubsidy = this.subsidiesService.subsidiesMap;
  typeActionModal = TypeActionModal;
  isModalVisible = false;

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
    // Columnas visibles iniciales
    this.columnVisibility = this.generalService.setColumnVisibility(
      this.headerListInvoices,
      ['date_payment', 'date_accounting'] // Coloca las columnas que deseas ocultar aquí
    );

    // Actualiza las columnas visibles según el estado de visibilidad
    this.displayedColumns = this.generalService.updateDisplayedColumns(
      this.headerListInvoices,
      this.columnVisibility
    );
  }
  ngOnChanges(changes: SimpleChanges): void {
    if (changes['item']) {
      const newItem = changes['item'].currentValue as SubsidyModelFullData;

      const key = newItem?.name + '_' + newItem?.year;
      if (
        key &&
        key !== this.previousKey &&
        newItem?.name &&
        newItem?.year &&
        newItem.name.trim() !== '' &&
        newItem.year !== 0
      ) {
        this.previousKey = key;
        this.load();
      }
    }
  }

  // ✅ Convierte "1.234,56", "123,45", "123.45", "€ 123,45" a number
  private toNumber(value: any): number {
    if (value == null || value === '') return 0;
    if (typeof value === 'number' && isFinite(value)) return value;

    const s = String(value)
      .trim()
      .replace(/[\s€]/g, '') // quita espacios y símbolo €
      .replace(/\.(?=\d{3}(?:[.,]|$))/g, '') // quita separadores de miles con punto
      .replace(/,(?=\d{2}(?:\D|$))/g, '.'); // coma decimal → punto (europeo)

    const n = Number(s);
    return isFinite(n) ? n : 0;
  }

  load(): void {
    if (!this.item?.name || !this.item?.year) return;
    this.loading = true;

    this.invoicesService
      .getInvoicesBySubsidy(this.item.name, this.item.year)
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        tap((invoices: InvoiceModelFullData[]) => {
          // 🔧 Normaliza campos numéricos una sola vez
          this.filteredInvoices = invoices
            .map((inv) => ({
              ...inv,
              amount: this.toNumber(inv.amount),
              iva: this.toNumber(inv.iva),
              irpf: this.toNumber(inv.irpf),
              total_amount: this.toNumber(inv.total_amount),
            }))
            .sort((a, b) => {
              const ta = a?.date_invoice
                ? new Date(a.date_invoice).getTime()
                : Number.POSITIVE_INFINITY;
              const tb = b?.date_invoice
                ? new Date(b.date_invoice).getTime()
                : Number.POSITIVE_INFINITY;
              return ta - tb; // más alejado (antiguo) primero
            });

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

  getVisibleColumns() {
    return this.headerListInvoices.filter(
      (col) => this.columnVisibility[col.key]
    );
  }
  // Método para actualizar las columnas visibles cuando se hace toggle
  toggleColumn(key: string): void {
    this.columnVisibility[key] = !this.columnVisibility[key];

    this.displayedColumns = this.generalService.updateDisplayedColumns(
      this.headerListInvoices,
      this.columnVisibility
    );
  }
  downloadFilteredPdfs(includeProof: boolean = true): void {
    const data = this.filteredInvoices || [];

    this.invoicesService
      .downloadInvoicesZipFromData(data, {
        includeProof, // true: invoice+proof | false: solo invoice
        filename: includeProof ? 'documentos.zip' : 'facturas.zip',
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
