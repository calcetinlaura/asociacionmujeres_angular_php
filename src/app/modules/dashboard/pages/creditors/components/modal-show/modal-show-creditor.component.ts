import { CommonModule, KeyValue } from '@angular/common';
import {
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  Input,
} from '@angular/core';
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';

import { CreditorWithInvoices } from 'src/app/core/interfaces/creditor.interface';
import { TypeList } from 'src/app/core/models/general.model';
import { TableInvoicesComponent } from 'src/app/modules/dashboard/components/table/table-invoice/table-invoice.component';
import { TotalsByYearTableComponent } from 'src/app/modules/dashboard/components/table/table-total-years/table-total-years.component';
import { TextBackgroundComponent } from 'src/app/shared/components/text/text-background/text-background.component';
import { TextEditorComponent } from 'src/app/shared/components/text/text-editor/text-editor.component';
import { TextIconComponent } from 'src/app/shared/components/text/text-icon/text-icon.component';
import { TextSubTitleComponent } from 'src/app/shared/components/text/text-subTitle/text-subtitle.component';
import { TextTitleComponent } from 'src/app/shared/components/text/text-title/text-title.component';
import { PhoneFormatPipe } from 'src/app/shared/pipe/phoneFormat.pipe';

type Invoice = CreditorWithInvoices['invoices'][number];

@Component({
  selector: 'app-modal-show-creditor',
  imports: [
    CommonModule,
    TextBackgroundComponent,
    TextTitleComponent,
    TextSubTitleComponent,
    TextIconComponent,
    TextEditorComponent,
    PhoneFormatPipe,
    TableInvoicesComponent,
    TotalsByYearTableComponent,
  ],
  templateUrl: './modal-show-creditor.component.html',
  styleUrl: './modal-show-creditor.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ModalShowCreditorComponent {
  // Guardamos internamente el input sin mutarlo
  private _item!: CreditorWithInvoices;

  @Input() set item(value: CreditorWithInvoices) {
    this._item = value;
    this.prepareData();
    this.cdr.markForCheck(); // asegura CD con OnPush
  }
  get item(): CreditorWithInvoices {
    return this._item;
  }

  typeModal: TypeList = TypeList.Creditors;

  /** Datos precalculados para la plantilla */
  invoicesSorted: Invoice[] = [];
  invoicesByYear = new Map<number, Invoice[]>();
  totalAmountByYear = new Map<number, number>();
  totalAmount = 0;
  totalInvoices = 0;

  constructor(
    private cdr: ChangeDetectorRef,
    private sanitizer: DomSanitizer
  ) {}

  /** Prepara todas las estructuras derivadas sin funciones en plantilla */
  private prepareData(): void {
    const src = this._item?.invoices ?? [];
    this.totalInvoices = this.item.invoices.length;

    // 1) Orden seguro (no muta el input)
    this.invoicesSorted = src
      .filter((i) => !!i?.date_invoice)
      .slice()
      .sort(
        (a, b) =>
          new Date(b.date_invoice!).getTime() -
          new Date(a.date_invoice!).getTime()
      );

    // 2) Agrupar por año
    this.invoicesByYear = new Map<number, Invoice[]>();
    for (const inv of this.invoicesSorted) {
      const y = new Date(inv.date_invoice!).getFullYear();
      if (!this.invoicesByYear.has(y)) this.invoicesByYear.set(y, []);
      this.invoicesByYear.get(y)!.push(inv);
    }

    // 3) Totales por año
    this.totalAmountByYear = new Map<number, number>();
    for (const [year, list] of this.invoicesByYear.entries()) {
      const total = list.reduce(
        (sum, i) => sum + Number(i.total_amount || 0),
        0
      );
      this.totalAmountByYear.set(year, total);
    }

    // 4) Total general
    this.totalAmount = Array.from(this.totalAmountByYear.values()).reduce(
      (s, v) => s + v,
      0
    );
  }

  /** Comparador para *keyvalue* (años descendente) */
  keyDesc(
    a: KeyValue<number, Invoice[]>,
    b: KeyValue<number, Invoice[]>
  ): number {
    return +b.key - +a.key;
  }

  /** trackBy estables para evitar NG0956 */
  trackYear = (_: number, kv: KeyValue<number, Invoice[]>) => kv.key;
  trackInvoice = (_: number, inv: Invoice) =>
    (inv as any).id ?? (inv as any).number_invoice ?? _;

  /** Sanitización controlada: usar solo si la fuente es de confianza */
  safeDescription(html: string | null | undefined): SafeHtml {
    return this.sanitizer.bypassSecurityTrustHtml(html ?? '');
  }
  get invoicesRows() {
    const rows = [...this.invoicesByYear.entries()].map(([year, list]) => ({
      year,
      count: list.length,
      amount: this.totalAmountByYear.get(year) ?? 0,
    }));
    return rows.sort((a, b) => Number(b.year) - Number(a.year));
  }
}
