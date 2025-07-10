import { CommonModule } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import {
  Component,
  EventEmitter,
  Input,
  OnChanges,
  Output,
  SimpleChanges,
} from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { DomSanitizer, SafeResourceUrl } from '@angular/platform-browser';
import { TypeList } from 'src/app/core/models/general.model';

@Component({
    selector: 'app-pdf-control',
    templateUrl: './pdf-control.component.html',
    imports: [CommonModule, MatButtonModule]
})
export class PdfControlComponent implements OnChanges {
  @Input() previewPdf: string | File | null = null;
  @Input() type: TypeList | null = null;
  @Output() pdfSelected = new EventEmitter<File | null>();
  @Input() pdfViewerHeight: number = 350;
  pdfHeight = 0;
  previewUrl: SafeResourceUrl | null = null;
  fullPdfUrl: string = '';
  isPdfAvailable = false;

  basePath = '/uploads/pdf';
  placeholder = 'assets/img/error.jpg';

  constructor(private sanitizer: DomSanitizer, private http: HttpClient) {}

  ngOnChanges(changes: SimpleChanges): void {
    this.loadPdf();
  }

  private loadPdf(): void {
    this.pdfHeight = this.pdfViewerHeight - 32 - 72;
    this.isPdfAvailable = false;

    if (!this.previewPdf || !this.type) {
      this.previewUrl = null;
      return;
    }

    if (this.previewPdf instanceof File) {
      const blobUrl = URL.createObjectURL(this.previewPdf);
      this.previewUrl = this.sanitizer.bypassSecurityTrustResourceUrl(blobUrl);
      this.isPdfAvailable = true;
      return;
    }

    if (typeof this.previewPdf === 'string') {
      const match = this.previewPdf.match(/^(\d{4})_/);
      const yearFolder = match ? match[1] : '';
      this.fullPdfUrl = `${this.basePath}/${this.type}/${yearFolder}/${this.previewPdf}`;

      // ✅ Esperar un tick para asegurar que `type` ya está
      setTimeout(() => {
        this.http.head(this.fullPdfUrl, { observe: 'response' }).subscribe({
          next: (res) => {
            if (res.status === 200) {
              this.previewUrl = this.sanitizer.bypassSecurityTrustResourceUrl(
                this.fullPdfUrl
              );
              this.isPdfAvailable = true;
            } else {
              this.previewUrl = null;
              this.isPdfAvailable = false;
            }
          },
          error: () => {
            this.previewUrl = null;
            this.isPdfAvailable = false;
          },
        });
      }, 0); // 🔁 Ejecuta esto después del render actual
    }
  }

  onFileSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];

    if (file && file.type === 'application/pdf') {
      this.previewUrl = this.sanitizer.bypassSecurityTrustResourceUrl(
        URL.createObjectURL(file)
      );
      this.pdfSelected.emit(file);
      this.isPdfAvailable = true;
    }
  }

  removePdf(): void {
    this.previewUrl = null;
    this.isPdfAvailable = false;
    this.pdfSelected.emit(null);
  }

  openPdfNewWindow(): void {
    if (this.previewUrl && this.isPdfAvailable) {
      const url = (this.previewUrl as any)
        .changingThisBreaksApplicationSecurity;
      window.open(url, '_blank');
    }
  }
}
