import { CommonModule } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  EventEmitter,
  Input,
  Output,
  computed,
  signal,
} from '@angular/core';
import { InvoiceModelFullData } from 'src/app/core/interfaces/invoice.interface';
import { TypeInvoiceBadgeComponent } from 'src/app/shared/components/type-invoice-badge/type-invoice-badge.component';
import { EurosFormatPipe } from 'src/app/shared/pipe/eurosFormat.pipe';
import { SafeHtmlPipe } from 'src/app/shared/pipe/safe-html.pipe';

@Component({
  selector: 'app-invoices-table',
  standalone: true,
  imports: [
    CommonModule,
    EurosFormatPipe,
    SafeHtmlPipe,
    TypeInvoiceBadgeComponent,
  ],
  templateUrl: './table-invoice.component.html',
  styleUrls: ['./table-invoice.component.css'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class TableInvoicesComponent {
  private _invoices = signal<InvoiceModelFullData[]>([]);
  @Input({ required: true }) set invoices(
    v: InvoiceModelFullData[] | null | undefined
  ) {
    this._invoices.set(v ?? []);
  }
  get invoices() {
    return this._invoices();
  }

  @Input() showCreditor = true;
  @Input() showType = true;
  @Input() showCif = true;
  @Input() showIndex = true;
  @Input() showTotals = true;
  @Input() totalLabel = 'TOTAL';

  @Output() rowClick = new EventEmitter<number>();

  total = computed(() =>
    this._invoices().reduce(
      (acc, it) => acc + (Number(it.total_amount) || 0),
      0
    )
  );

  trackByInvoice = (_: number, inv: InvoiceModelFullData) =>
    inv.id ?? inv.number_invoice;

  onRowClick(invId: number) {
    this.rowClick!.emit(invId);
  }
}
