import { CommonModule } from '@angular/common';
import { Component, Input } from '@angular/core';
import { InvoiceModelFullData } from 'src/app/core/interfaces/invoice.interface';
import { TypeList } from 'src/app/core/models/general.model';
import { TextBackgroundComponent } from 'src/app/shared/components/text/text-background/text-background.component';
import { TextBorderComponent } from 'src/app/shared/components/text/text-border/text-border.component';
import { TextEditorComponent } from 'src/app/shared/components/text/text-editor/text-editor.component';
import { TextIconComponent } from 'src/app/shared/components/text/text-icon/text-icon.component';
import { TextTitleComponent } from 'src/app/shared/components/text/text-title/text-title.component';
import { EurosFormatPipe } from 'src/app/shared/pipe/eurosFormat.pipe';

@Component({
  selector: 'app-modal-show-invoice',
  standalone: true,
  imports: [
    CommonModule,
    TextBackgroundComponent,
    TextBorderComponent,
    TextTitleComponent,
    TextEditorComponent,
    TextIconComponent,
    EurosFormatPipe,
  ],
  templateUrl: './modal-show-invoice.component.html',
})
export class ModalShowInvoiceComponent {
  @Input() item!: InvoiceModelFullData;
  type: TypeList = TypeList.Invoices;
}
