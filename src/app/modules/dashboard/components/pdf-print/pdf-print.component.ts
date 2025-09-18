import { CommonModule } from '@angular/common';
import { Component, ElementRef, Input, ViewChild } from '@angular/core';

@Component({
  standalone: true,
  selector: 'app-pdf-print',
  imports: [CommonModule],
  template: `
    <div #area class="pdf-print-container">
      <ng-content></ng-content>
    </div>
  `,
  styleUrls: ['./pdf-print.component.css'],
})
export class PdfPrintComponent {
  @Input() filename = 'documento.pdf';
  @Input() preset: 'compact' | 'normal' | 'large' = 'normal';
  @Input() orientation: 'portrait' | 'landscape' = 'portrait';
  @Input() margins: [number, number, number, number] = [5, 5, 5, 5]; // mm

  @ViewChild('area', { static: true }) areaRef!: ElementRef<HTMLElement>;

  private mmToPx(mm: number) {
    return (mm * 96) / 25.4;
  }

  async print(): Promise<void> {
    // usa el bundle UMD (estable)
    // @ts-expect-error tipos del bundle
    const mod = await import('html2pdf.js/dist/html2pdf.bundle.min.js');
    const html2pdf = (mod as any).default || (mod as any);

    const el = this.areaRef.nativeElement;
    const presets = {
      compact: { font: '11px', line: '1.2', pad: '4px' },
      normal: { font: '13px', line: '1.25', pad: '8px' },
      large: { font: '15px', line: '1.3', pad: '12px' },
    } as const;
    const p = presets[this.preset];

    const pageWidthMm = this.orientation === 'landscape' ? 297 : 210;
    const contentWidthMm = pageWidthMm - this.margins[1] - this.margins[3];
    const contentWidthPx = Math.floor(this.mmToPx(contentWidthMm));

    // modo impresión
    el.classList.add('pdf-print');
    const prev = {
      w: el.style.width,
      mw: el.style.maxWidth,
      ov: el.style.overflow,
    };
    el.style.width = `${contentWidthPx}px`;
    el.style.maxWidth = `${contentWidthPx}px`;
    el.style.overflow = 'visible';
    el.style.setProperty('--pdf-font-size', p.font);
    el.style.setProperty('--pdf-line-height', p.line);
    el.style.setProperty('--pdf-cell-padding', p.pad);

    try {
      await html2pdf()
        .set({
          margin: this.margins,
          filename: this.filename,
          image: { type: 'jpeg', quality: 0.98 },
          html2canvas: {
            scale: 2,
            useCORS: true,
            logging: false,
            backgroundColor: '#ffffff',
            windowWidth: contentWidthPx,
            scrollX: 0,
            scrollY: 0,
            foreignObjectRendering: false,
          },
          pagebreak: { mode: ['css', 'legacy'] },
          jsPDF: { unit: 'mm', format: 'a4', orientation: this.orientation },
        })
        .from(el)
        .save();
    } finally {
      // limpieza
      el.classList.remove('pdf-print');
      el.style.width = prev.w;
      el.style.maxWidth = prev.mw;
      el.style.overflow = prev.ov;
      el.style.removeProperty('--pdf-font-size');
      el.style.removeProperty('--pdf-line-height');
      el.style.removeProperty('--pdf-cell-padding');
    }
  }
}
