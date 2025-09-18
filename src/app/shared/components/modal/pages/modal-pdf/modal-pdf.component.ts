import {
  Component,
  EventEmitter,
  Input,
  OnChanges,
  Output,
  SimpleChanges,
} from '@angular/core';
import { DomSanitizer, SafeResourceUrl } from '@angular/platform-browser';
import { TypeList } from 'src/app/core/models/general.model';
import { UiModalComponent } from 'src/app/shared/components/modal/ui-modal.component';

@Component({
  selector: 'app-modal-pdf',
  templateUrl: './modal-pdf.component.html',
  standalone: true,
  imports: [UiModalComponent],
})
export class ModalPdfComponent implements OnChanges {
  @Input() open = false;
  @Output() openChange = new EventEmitter<boolean>();

  @Input() pdfUrl!: string;
  @Input() year: string | number | null = null;
  @Input() type: TypeList = TypeList.Invoices;
  @Input() basePath: string = '/uploads/pdf';

  safeSrc: SafeResourceUrl | null = null;

  constructor(private sanitizer: DomSanitizer) {}

  ngOnChanges(_: SimpleChanges): void {
    const full = this.buildFullUrl(
      this.pdfUrl,
      this.year,
      this.type,
      this.basePath
    );
    const withParams = full ? this.addViewerParams(full) : null;
    this.safeSrc = withParams
      ? this.sanitizer.bypassSecurityTrustResourceUrl(withParams)
      : null;
  }

  private addViewerParams(url: string): string {
    // Chrome/Edge suelen respetar #zoom=page-width; otros aceptan view=FitH
    const sep = url.includes('#') ? '&' : '#';
    return `${url}${sep}zoom=page-width&view=FitH&pagemode=none`;
  }

  private buildFullUrl(
    file: string,
    year: string | number | null,
    type: TypeList,
    basePath: string
  ): string | null {
    if (!file) return null;
    if (/^https?:\/\//i.test(file) || file.startsWith('/')) return file;

    let yearSeg = '';
    if (year) {
      yearSeg = `/${year}`;
    } else {
      const m = file.match(/^(\d{4})_/);
      yearSeg = m ? `/${m[1]}` : '';
    }

    const typeSeg = type ? `/${type.toLowerCase()}` : '';
    const base = basePath.endsWith('/') ? basePath.slice(0, -1) : basePath;
    return `${base}${typeSeg}${yearSeg}/${file}`;
  }

  close() {
    this.open = false;
    this.openChange.emit(false);
  }
}
