import { Injectable } from '@angular/core';

export type PngOptions = {
  scale?: number;
  background?: string | null;
};

@Injectable({ providedIn: 'root' })
export class ChartExportService {
  // ── SVG → string ─────────────────────────────────────────────
  private serializeSvg(svgEl: SVGSVGElement): string {
    const clone = svgEl.cloneNode(true) as SVGSVGElement;

    if (!clone.getAttribute('xmlns')) {
      clone.setAttribute('xmlns', 'http://www.w3.org/2000/svg');
    }
    if (!clone.getAttribute('xmlns:xlink')) {
      clone.setAttribute('xmlns:xlink', 'http://www.w3.org/1999/xlink');
    }

    const vb = clone.viewBox?.baseVal;
    if (!vb || !vb.width || !vb.height) {
      const width = svgEl.viewBox?.baseVal?.width || svgEl.clientWidth || 512;
      const height =
        svgEl.viewBox?.baseVal?.height || svgEl.clientHeight || 512;
      clone.setAttribute('viewBox', `0 0 ${width} ${height}`);
    }

    return new XMLSerializer().serializeToString(clone);
  }

  // ── SVG → PNG (Blob) ─────────────────────────────────────────
  async toPng(svgEl: SVGSVGElement, opts: PngOptions = {}): Promise<Blob> {
    const { scale = 2, background = '#ffffff' } = opts;

    const xml = this.serializeSvg(svgEl);
    const svg64 = btoa(unescape(encodeURIComponent(xml)));
    const imgSrc = `data:image/svg+xml;base64,${svg64}`;

    const width = svgEl.viewBox?.baseVal?.width || svgEl.clientWidth || 512;
    const height = svgEl.viewBox?.baseVal?.height || svgEl.clientHeight || 512;

    return new Promise<Blob>((resolve, reject) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        canvas.width = Math.max(1, Math.floor(width * scale));
        canvas.height = Math.max(1, Math.floor(height * scale));
        const ctx = canvas.getContext('2d');
        if (!ctx) return reject(new Error('Canvas 2D context not available'));

        if (background) {
          ctx.fillStyle = background;
          ctx.fillRect(0, 0, canvas.width, canvas.height);
        }

        ctx.imageSmoothingEnabled = true;
        ctx.imageSmoothingQuality = 'high';
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

        canvas.toBlob((blob) => {
          if (!blob) return reject(new Error('No se pudo generar PNG'));
          resolve(blob);
        }, 'image/png');
      };
      img.onerror = (e) => reject(e);
      img.src = imgSrc;
    });
  }

  // ── SVG → Blob ────────────────────────────────────────────────
  toSvgBlob(svgEl: SVGSVGElement): Blob {
    const xml = this.serializeSvg(svgEl);
    return new Blob([xml], { type: 'image/svg+xml;charset=utf-8' });
  }

  // ── Descarga helpers ─────────────────────────────────────────
  downloadBlob(blob: Blob, filename: string) {
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.rel = 'noopener';
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 0);
  }

  async downloadPng(
    svgEl: SVGSVGElement,
    filename: string,
    opts: PngOptions = {}
  ) {
    const blob = await this.toPng(svgEl, opts);
    this.downloadBlob(blob, filename);
  }

  downloadSvg(svgEl: SVGSVGElement, filename: string) {
    const blob = this.toSvgBlob(svgEl);
    this.downloadBlob(blob, filename);
  }

  // ── Impresión en ventana (opcional) ──────────────────────────
  printElement(el: HTMLElement, title?: string): void {
    const safeTitle = title ?? document.title;
    const w = window.open(
      '',
      '_blank',
      'noopener,noreferrer,width=900,height=700'
    );
    if (!w) return;

    const stylesHtml = this.collectActiveStyles(document);
    const headHtml = `
      <head>
        <meta charset="utf-8">
        <title>${this.escapeHtml(safeTitle)}</title>
        <meta name="viewport" content="width=device-width, initial-scale=1">
        ${stylesHtml}
      </head>
    `;

    const bodyHtml = `
      <body>
        <div class="print-wrap">
          ${el.outerHTML}
        </div>
        <style>
          @media print {
            html, body { margin: 0; padding: 0; }
            .print-wrap { padding: 16px; }
            * { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
            .chart-card__actions { display: none !important; }
            .chart-card { box-shadow: none !important; }
          }
        </style>
      </body>
    `;

    w.document.open();
    w.document.write(`<!doctype html><html>${headHtml}${bodyHtml}</html>`);
    w.document.close();

    const doPrint = () => {
      try {
        w.focus();
        w.print();
      } finally {
        w.close();
      }
    };

    if ('fonts' in w.document) {
      (w.document as any).fonts.ready
        .then(() => setTimeout(doPrint, 50))
        .catch(() => setTimeout(doPrint, 150));
    } else {
      setTimeout(doPrint, 150);
    }
  }

  // ── Impresión en iframe (recomendada) ────────────────────────
  printCardElement(cardEl: HTMLElement, title?: string) {
    if (!cardEl) return;
    const safeTitle = title ?? document.title;

    const iframe = document.createElement('iframe');
    iframe.style.position = 'fixed';
    iframe.style.right = '0';
    iframe.style.bottom = '0';
    iframe.style.width = '0';
    iframe.style.height = '0';
    iframe.style.border = '0';
    iframe.style.visibility = 'hidden';
    document.body.appendChild(iframe);

    const w = iframe.contentWindow!;
    const d = iframe.contentDocument!;

    const copyHeadStyles = () => {
      const head = document.head;
      const chunks: string[] = [];
      chunks.push(`<base href="${this.escapeAttr(document.baseURI)}">`);

      head.querySelectorAll('link[rel="stylesheet"]').forEach((lnk) => {
        const el = lnk as HTMLLinkElement;
        if (el.href) {
          chunks.push(
            `<link rel="stylesheet" href="${this.escapeAttr(el.href)}"${
              el.crossOrigin
                ? ` crossorigin="${this.escapeAttr(el.crossOrigin)}"`
                : ''
            }>`
          );
        }
      });

      head.querySelectorAll('style').forEach((st) => {
        chunks.push(st.outerHTML);
      });

      chunks.push(`
        <style>
          @page { size: auto; margin: 12mm; }
          html, body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
          .chart-card { box-shadow: none !important; }
          .chart-card__actions { display: none !important; }
        </style>
      `);

      return chunks.join('\n');
    };

    const contentHtml = cardEl.outerHTML;

    d.open();
    d.write(`<!doctype html>
<html>
<head>
<meta charset="utf-8">
<title>${this.escapeHtml(safeTitle)}</title>
${copyHeadStyles()}
</head>
<body>
${contentHtml}
</body>
</html>`);
    d.close();

    const doPrint = async () => {
      try {
        if (d.readyState !== 'complete') {
          await new Promise<void>((res) =>
            iframe.addEventListener('load', () => res(), {
              once: true,
              passive: true,
            })
          );
        }
        const f = (d as any).fonts;
        if (f && typeof f.ready?.then === 'function') {
          await f.ready;
        }
      } catch {}

      setTimeout(() => {
        try {
          w.focus();
          w.print();
        } finally {
          setTimeout(() => {
            document.body.removeChild(iframe);
          }, 100);
        }
      }, 50);
    };

    void doPrint();
  }

  // ── Estilos activos ──────────────────────────────────────────
  private collectActiveStyles(srcDoc: Document): string {
    const parts: string[] = [];

    srcDoc
      .querySelectorAll<HTMLLinkElement>('link[rel="stylesheet"]')
      .forEach((l) => {
        const href = l.href;
        parts.push(`<link rel="stylesheet" href="${this.escapeAttr(href)}">`);
      });

    srcDoc.querySelectorAll<HTMLStyleElement>('style').forEach((s) => {
      parts.push(`<style>${s.textContent ?? ''}</style>`);
    });

    try {
      for (const sheet of Array.from(srcDoc.styleSheets) as CSSStyleSheet[]) {
        try {
          const rules = Array.from(sheet.cssRules || []);
          if (!rules.length) continue;
          parts.push('<style>');
          for (const r of rules) parts.push((r as CSSRule).cssText);
          parts.push('</style>');
        } catch {}
      }
    } catch {}

    return parts.join('\n');
  }

  // ── Helpers de escape robustos ───────────────────────────────
  private escapeHtml(s: unknown): string {
    const map: Record<string, string> = {
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      '"': '&quot;',
      "'": '&#39;',
    };
    return String(s ?? '').replace(/[&<>"']/g, (ch: string) => map[ch] ?? ch);
  }

  private escapeAttr(s: unknown) {
    // Acepta string | null | undefined y devuelve string seguro
    return String(s ?? '').replace(/["']/g, (m) =>
      m === '"' ? '&quot;' : '&#39;'
    );
  }
}
