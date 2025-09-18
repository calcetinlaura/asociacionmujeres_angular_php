import { CommonModule } from '@angular/common';
import { Component, Input, SimpleChanges } from '@angular/core';
import { DomSanitizer, SafeResourceUrl } from '@angular/platform-browser';
import { InvoiceModelFullData } from 'src/app/core/interfaces/invoice.interface';
import { TypeList } from 'src/app/core/models/general.model';
import { ModalPdfComponent } from 'src/app/shared/components/modal/pages/modal-pdf/modal-pdf.component';
import { TextBackgroundComponent } from 'src/app/shared/components/text/text-background/text-background.component';
import { TextEditorComponent } from 'src/app/shared/components/text/text-editor/text-editor.component';
import { TextSubTitleComponent } from 'src/app/shared/components/text/text-subTitle/text-subtitle.component';
import { TextTitleComponent } from 'src/app/shared/components/text/text-title/text-title.component';
import { EurosFormatPipe } from 'src/app/shared/pipe/eurosFormat.pipe';

type PdfKind = 'invoice' | 'proof';

@Component({
  selector: 'app-modal-show-invoice',
  imports: [
    CommonModule,
    TextBackgroundComponent,
    TextTitleComponent,
    TextEditorComponent,
    EurosFormatPipe,
    TextSubTitleComponent,
    ModalPdfComponent,
  ],
  templateUrl: './modal-show-invoice.component.html',
})
export class ModalShowInvoiceComponent {
  @Input() item!: InvoiceModelFullData;

  typeModal: TypeList = TypeList.Invoices;

  // Modal state
  selectedPdf: string | null = null;
  showPdf = false;

  // Previews
  invoicePreviewUrl: SafeResourceUrl | null = null; // para <object>
  proofPreviewUrl: SafeResourceUrl | null = null;

  // Raws (sin sanitize) para abrir en modal
  private invoiceRawUrl: string | null = null;
  private proofRawUrl: string | null = null;

  private basePath = '/uploads/pdf';

  constructor(private sanitizer: DomSanitizer) {}

  ngOnChanges(_: SimpleChanges): void {
    this.setPreviewsFromItem();
  }

  private setPreviewsFromItem(): void {
    // Reset
    this.invoicePreviewUrl = null;
    this.proofPreviewUrl = null;
    this.invoiceRawUrl = null;
    this.proofRawUrl = null;

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

  /** Construye URL absoluta si ya viene con http(s) o empieza por '/', si no la monta en /uploads/pdf/{type}/{YYYY}/ */
  private buildPdfUrl(nameOrUrl: string): string {
    if (!nameOrUrl) return '';
    if (/^https?:\/\//i.test(nameOrUrl) || nameOrUrl.startsWith('/')) {
      return nameOrUrl;
    }
    const m = nameOrUrl.match(/^(\d{4})_/);
    const yearFolder = m ? `${m[1]}` : '';
    return `${this.basePath}/${this.typeModal}/${yearFolder}/${nameOrUrl}`;
  }

  openPdfModal(kind: PdfKind): void {
    const src = kind === 'invoice' ? this.invoiceRawUrl : this.proofRawUrl;
    if (src) {
      this.selectedPdf = src;
      this.showPdf = true;
    }
  }

  onPdfOpenChange(open: boolean) {
    this.showPdf = open;
    if (!open) this.selectedPdf = null;
  }

  onPreviewKeydown(ev: KeyboardEvent, kind: PdfKind): void {
    if (ev.key === 'Enter' || ev.key === ' ') {
      ev.preventDefault();
      this.openPdfModal(kind);
    }
  }
}
