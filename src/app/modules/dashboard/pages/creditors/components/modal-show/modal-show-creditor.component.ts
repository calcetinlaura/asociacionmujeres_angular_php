import { CommonModule } from '@angular/common';
import { Component, Input } from '@angular/core';
import { CreditorWithInvoices } from 'src/app/core/interfaces/creditor.interface';
import { TypeList } from 'src/app/core/models/general.model';
import { TextBackgroundComponent } from 'src/app/shared/components/text/text-background/text-background.component';
import { TextEditorComponent } from 'src/app/shared/components/text/text-editor/text-editor.component';
import { TextIconComponent } from 'src/app/shared/components/text/text-icon/text-icon.component';
import { TextSubTitleComponent } from 'src/app/shared/components/text/text-subTitle/text-subtitle.component';
import { TextTitleComponent } from 'src/app/shared/components/text/text-title/text-title.component';
import { EurosFormatPipe } from 'src/app/shared/pipe/eurosFormat.pipe';
import { PhoneFormatPipe } from 'src/app/shared/pipe/phoneFormat.pipe';

@Component({
  selector: 'app-modal-show-creditor',
  imports: [
    CommonModule,
    TextBackgroundComponent,
    TextTitleComponent,
    TextSubTitleComponent,
    TextIconComponent,
    TextEditorComponent,
    EurosFormatPipe,
    PhoneFormatPipe,
  ],
  templateUrl: './modal-show-creditor.component.html',
  styleUrl: './modal-show-creditor.component.css',
})
export class ModalShowCreditorComponent {
  @Input() item!: CreditorWithInvoices;
  typeModal: TypeList = TypeList.Creditors;

  ngOnInit(): void {
    this.item.invoices = this.item.invoices
      .filter((invoice) => invoice.date_invoice) // 🔹 Elimina las que no tienen fecha
      .sort(
        (a, b) =>
          new Date(b.date_invoice!).getTime() -
          new Date(a.date_invoice!).getTime()
      );
  }

  getTotalAmount(): number {
    return (
      this.item.invoices?.reduce(
        (total, invoice) => Number(total) + Number(invoice.total_amount || 0),
        0
      ) || 0
    );
  }
  groupInvoicesByYear(invoices: any[]): { [year: string]: any[] } {
    if (!invoices || invoices.length === 0) return {};

    return invoices.reduce((acc, invoice) => {
      const year = new Date(invoice.date_invoice).getFullYear();
      acc[year] = acc[year] || [];
      acc[year].push(invoice);
      return acc;
    }, {} as { [year: string]: any[] });
  }

  // 📌 Obtener total de un año específico
  getTotalAmountByYear(invoices: any[]): number {
    return invoices.reduce(
      (sum, invoice) => Number(sum) + Number(invoice.total_amount || 0),
      0
    );
  }
}
