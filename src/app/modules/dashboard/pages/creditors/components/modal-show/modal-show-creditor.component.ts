import { CommonModule } from '@angular/common';
import { Component, Input } from '@angular/core';
import { CreditorWithInvoices } from 'src/app/core/interfaces/creditor.interface';
import { TypeList } from 'src/app/core/models/general.model';
import { TextBackgroundComponent } from 'src/app/shared/components/text/text-background/text-background.component';
import { TextSubTitleComponent } from 'src/app/shared/components/text/text-subTitle/text-subtitle.component';
import { TextTitleComponent } from 'src/app/shared/components/text/text-title/text-title.component';
import { TextIconComponent } from '../../../../../../shared/components/text/text-icon/text-icon.component';
import { TextEditorComponent } from '../../../../../../shared/components/text/text-editor/text-editor.component';
import { EurosFormatPipe } from '../../../../../../shared/pipe/eurosFormat.pipe';

@Component({
  selector: 'app-modal-show-creditor',
  standalone: true,
  imports: [
    CommonModule,
    TextBackgroundComponent,
    TextTitleComponent,
    TextSubTitleComponent,
    TextIconComponent,
    TextEditorComponent,
    EurosFormatPipe,
  ],
  templateUrl: './modal-show-creditor.component.html',
  styleUrl: './modal-show-creditor.component.css',
})
export class ModalShowCreditorComponent {
  @Input() item!: CreditorWithInvoices;
  type: TypeList = TypeList.Creditors;

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
}
