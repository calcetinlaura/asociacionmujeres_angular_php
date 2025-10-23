import { NgClass } from '@angular/common';
import { Component, Input } from '@angular/core';
import { DictTranslatePipe, DictType } from '../../pipe/dict-translate.pipe';

type TypeInvoice = 'TICKET' | 'INVOICE' | 'INCOME' | (string & {});

@Component({
  selector: 'app-type-invoice-badge',
  standalone: true,
  imports: [NgClass, DictTranslatePipe],
  templateUrl: './type-invoice-badge.component.html',
  styleUrls: ['./type-invoice-badge.component.css'],
})
export class TypeInvoiceBadgeComponent {
  @Input({ required: true }) value!: TypeInvoice;

  @Input() variantClasses: Record<string, string> = {
    TICKET: 'type-ticket',
    INVOICE: 'type-factura',
    INCOME: 'type-ingreso',
  };

  /** Clases extra opcionales (márgenes, tamaño, etc.) */
  @Input() extraClass = '';
  dictType = DictType;

  readonly baseClass = 'type-badge';
  readonly unknownClass = 'type-unknown';
}
