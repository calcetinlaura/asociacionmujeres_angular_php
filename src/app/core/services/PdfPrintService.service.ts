import { ElementRef, Injectable } from '@angular/core';

export type PdfPreset = 'compact' | 'normal' | 'large';
export type Orientation = 'portrait' | 'landscape';
export type PageFormat = 'a4' | 'letter';

export interface PrintOptions {
  filename?: string;
  preset?: PdfPreset; // densidad de texto/celdas
  orientation?: Orientation; // orientación
  format?: PageFormat; // 'a4' (por defecto) o 'letter'
  margins?: [number, number, number, number]; // mm
  addBodyClass?: string; // opcional: clase temporal al <body>
}

@Injectable({ providedIn: 'root' })
export class PdfPrintService {
  private mmToPx(mm: number) {
    return (mm * 96) / 25.4;
  }

  private async ensureFontsAndImages(root: HTMLElement) {
    try {
      (document as any).fonts && (await (document as any).fonts.ready);
    } catch {}
    const imgs = Array.from(root.querySelectorAll('img')).filter(
      (img) => !img.complete || img.naturalWidth === 0
    );
    await Promise.all(
      imgs.map(
        (img) =>
          new Promise<void>((res) => {
            const done = () => res();
            img.addEventListener('load', done, { once: true });
            img.addEventListener('error', done, { once: true });
          })
      )
    );
  }

  private pageWidthMm(format: PageFormat, orientation: Orientation): number {
    const map = {
      a4: { portrait: 210, landscape: 297 },
      letter: { portrait: 216, landscape: 279 }, // mm aprox
    } as const;
    return map[format][orientation];
  }

  /** Imprime el elemento pasado (o ElementRef) a PDF aplicando CSS de `.pdf-print`. */
  async printElementAsPdf(
    elementOrRef: HTMLElement | ElementRef<HTMLElement>,
    opts: PrintOptions = {}
  ): Promise<void> {
    // Import robusto del bundle (trae html2canvas + jsPDF integrados)
    // @ts-expect-error: el bundle no trae tipos
    const mod = await import('html2pdf.js/dist/html2pdf.bundle.min.js');
    const html2pdf = (mod as any).default || (mod as any);

    const el = (elementOrRef as ElementRef<HTMLElement>)?.nativeElement
      ? (elementOrRef as ElementRef<HTMLElement>).nativeElement
      : (elementOrRef as HTMLElement);
    if (!el) return;

    const {
      filename = 'documento.pdf',
      preset = 'normal',
      orientation = 'portrait',
      format = 'a4',
      margins = [5, 5, 5, 5],
      addBodyClass,
    } = opts;

    const presets = {
      compact: { font: '11px', line: '1.2', pad: '4px' },
      normal: { font: '13px', line: '1.25', pad: '8px' },
      large: { font: '15px', line: '1.3', pad: '12px' },
    } as const;
    const p = presets[preset];

    // Ancho útil en px (según formato, orientación y márgenes)
    const pageWidthMm = this.pageWidthMm(format, orientation);
    const contentWidthMm = pageWidthMm - margins[1] - margins[3];
    const contentWidthPx = Math.floor(this.mmToPx(contentWidthMm));

    // Espera recursos (evita “PDF en blanco”)
    await this.ensureFontsAndImages(el);

    // Modo impresión (solo en el elemento objetivo)
    addBodyClass && document.body.classList.add(addBodyClass);
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
          margin: margins,
          filename,
          image: { type: 'jpeg', quality: 0.98 },
          html2canvas: {
            scale: 2,
            useCORS: true,
            logging: false,
            backgroundColor: '#ffffff',
            windowWidth: contentWidthPx, // clave: evita recorte lateral
            scrollX: 0,
            scrollY: 0,
            foreignObjectRendering: false,
          },
          pagebreak: { mode: ['css', 'legacy'] },
          jsPDF: { unit: 'mm', format, orientation },
        })
        .from(el)
        .save();
    } finally {
      el.classList.remove('pdf-print');
      el.style.width = prev.w;
      el.style.maxWidth = prev.mw;
      el.style.overflow = prev.ov;
      el.style.removeProperty('--pdf-font-size');
      el.style.removeProperty('--pdf-line-height');
      el.style.removeProperty('--pdf-cell-padding');
      addBodyClass && document.body.classList.remove(addBodyClass);
    }
  }

  /** API cómoda si vienes del servicio viejo: imprime por id/selector */
  async printBySelector(
    selector: string,
    filename = 'documento.pdf',
    options?: Omit<PrintOptions, 'filename'>
  ) {
    const el =
      document.getElementById(selector) ||
      (document.querySelector(selector) as HTMLElement | null);
    if (!el) return;
    await this.printElementAsPdf(el, { filename, ...(options ?? {}) });
  }
}
