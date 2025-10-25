import { CommonModule } from '@angular/common';
import {
  Component,
  EventEmitter,
  Input,
  Output,
  SimpleChanges,
} from '@angular/core';
import { DomSanitizer, SafeResourceUrl } from '@angular/platform-browser';
import { InvoiceModelFullData } from 'src/app/core/interfaces/invoice.interface';
import { TypeList } from 'src/app/core/models/general.model';
import { TextBackgroundComponent } from 'src/app/shared/components/text/text-background/text-background.component';
import { TextSubTitleComponent } from 'src/app/shared/components/text/text-subTitle/text-subtitle.component';
import { TextTitleComponent } from 'src/app/shared/components/text/text-title/text-title.component';
import { TypeInvoiceBadgeComponent } from 'src/app/shared/components/type-invoice-badge/type-invoice-badge.component';
import { EurosFormatPipe } from 'src/app/shared/pipe/eurosFormat.pipe';
import { SafeHtmlPipe } from 'src/app/shared/pipe/safe-html.pipe';

type PdfKind = 'invoice' | 'proof';

@Component({
  selector: 'app-modal-show-invoice',
  standalone: true,
  imports: [
    CommonModule,
    TextBackgroundComponent,
    TextTitleComponent,
    EurosFormatPipe,
    TextSubTitleComponent,
    TypeInvoiceBadgeComponent,
    SafeHtmlPipe,
  ],
  templateUrl: './modal-show-invoice.component.html',
})
export class ModalShowInvoiceComponent {
  @Input() item!: InvoiceModelFullData;

  // 👉 Emite al router para abrir el visor PDF global
  @Output() openPdfReq = new EventEmitter<{
    url: string;
    year: number | null;
    type: TypeList;
  }>();

  typeModal: TypeList = TypeList.Invoices;

  // Previews embebidas (si las usas en el HTML)
  invoicePreviewUrl: SafeResourceUrl | null = null;
  proofPreviewUrl: SafeResourceUrl | null = null;

  // URLs crudas para el visor global
  private invoiceRawUrl: string | null = null;
  private proofRawUrl: string | null = null;

  private basePath = '/uploads/pdf';

  constructor(private sanitizer: DomSanitizer) {}

  ngOnChanges(_: SimpleChanges): void {
    this.setPreviewsFromItem();
  }

  private setPreviewsFromItem(): void {
    this.invoicePreviewUrl = this.proofPreviewUrl = null;
    this.invoiceRawUrl = this.proofRawUrl = null;

    if (this.item?.invoice_pdf) {
      const invSrc = this.buildPdfUrl(this.item.invoice_pdf);
      this.invoiceRawUrl = invSrc;
      this.invoicePreviewUrl =
        this.sanitizer.bypassSecurityTrustResourceUrl(invSrc);
    }
    if (this.item?.proof_pdf) {
      const proofSrc = this.buildPdfUrl(this.item.proof_pdf);
      this.proofRawUrl = proofSrc;
      this.proofPreviewUrl =
        this.sanitizer.bypassSecurityTrustResourceUrl(proofSrc);
    }
  }

  /** Devuelve absoluta si ya lo es; si no, /uploads/pdf/Invoices/{YYYY?}/nombre.pdf */
  private buildPdfUrl(nameOrUrl: string): string {
    if (!nameOrUrl) return '';
    if (/^https?:\/\//i.test(nameOrUrl) || nameOrUrl.startsWith('/'))
      return nameOrUrl;
    const m = nameOrUrl.match(/^(\d{4})_/);
    const yearFolder = m ? `${m[1]}` : '';
    return `${this.basePath}/${this.typeModal}/${yearFolder}/${nameOrUrl}`;
  }

  // 👉 Abre visor global (router)
  openPdf(kind: PdfKind): void {
    const src = kind === 'invoice' ? this.invoiceRawUrl : this.proofRawUrl;
    if (!src) return;
    const year = this.item?.date_invoice ?? this.extractYearFromFilename(src);
    this.openPdfReq.emit({
      url: src,
      year: Number(year) ?? null,
      type: TypeList.Invoices,
    });
  }

  onPreviewKeydown(ev: KeyboardEvent, kind: PdfKind): void {
    if (ev.key === 'Enter' || ev.key === ' ') {
      ev.preventDefault();
      this.openPdf(kind);
    }
  }

  private extractYearFromFilename(src: string): number | null {
    const m = src.match(/\/(\d{4})\//) || src.match(/(^|\/)(\d{4})_/);
    return m ? Number(m[1] ?? m[2]) : null;
  }
}
