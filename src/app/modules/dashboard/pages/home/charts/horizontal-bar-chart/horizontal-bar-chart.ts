import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component, Input } from '@angular/core';

export type HBarDatum = { label: string; value: number };

@Component({
  selector: 'app-horizontal-bar-chart',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './horizontal-bar-chart.html',
  styleUrls: ['./horizontal-bar-chart.css'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class HorizontalBarChartComponent {
  @Input() title = 'Eventos por espacio';

  /** Modo fluido: el SVG ocupa 100% del ancho del card (recomendado) */
  @Input() fluid = true;

  /** Ancho “interno” de la escena para el viewBox (no es el CSS width). */
  @Input() canvasWidth = 1200;

  /** Si NO usas `fluid`, puedes fijar un ancho en px con `width`. */
  @Input() width = 940;

  @Input() barHeight = 28;
  @Input() barGap = 10;
  @Input() padding = 16;

  /** Ancho reservado para el índice (doble que antes). */
  @Input() labelWidth = 240;

  /** Tipografía del índice y su interlineado. */
  @Input() labelFontSize = 12;
  @Input() labelLineHeight = 14;

  /** Máximo de líneas del índice. */
  @Input() maxLabelLines = 2;

  private _data: HBarDatum[] = [];
  @Input() set data(v: HBarDatum[] | null | undefined) {
    this._data = (v ?? []).filter((d) => d && typeof d.value === 'number');
  }
  get data() {
    return this._data;
  }

  // ===== Layout =====
  barX(): number {
    return this.padding + this.labelWidth;
  }
  usableWidth(): number {
    return this.canvasWidth - this.padding * 2 - this.labelWidth;
  }

  // ===== Data metrics =====
  maxValue(): number {
    if (!this._data.length) return 0;
    return this._data.reduce((m, d) => Math.max(m, d.value), 0);
  }
  svgHeight(): number {
    const n = this._data.length || 1;
    return this.padding * 2 + 24 + n * this.barHeight + (n - 1) * this.barGap;
  }
  barWidth(value: number): number {
    const max = this.maxValue();
    if (!max) return 0;
    return Math.max(0, (value / max) * this.usableWidth());
  }
  barY(i: number): number {
    return this.padding + 24 + i * (this.barHeight + this.barGap);
  }

  // ===== Etiquetas a dos líneas =====
  /** estimación simple de chars por línea */
  private maxCharsPerLine(): number {
    const pxPerChar = this.labelFontSize * 0.6; // aprox
    const usable = Math.max(0, this.labelWidth - 8);
    return Math.max(2, Math.floor(usable / pxPerChar));
  }

  wrapLabel(label: string): string[] {
    if (!label) return [''];
    const limit = this.maxCharsPerLine();
    const words = label.split(/\s+/).filter(Boolean);
    const lines: string[] = [];
    let current = '';

    const push = () => {
      if (current) {
        lines.push(current.trim());
        current = '';
      }
    };

    for (const w of words) {
      if (!current) {
        if (w.length > limit) {
          // palabra larguísima: parte duro
          lines.push(w.slice(0, limit));
          const rest = w.slice(limit);
          if (rest) lines.push(rest.slice(0, limit));
        } else current = w;
      } else {
        const candidate = `${current} ${w}`;
        if (candidate.length <= limit) current = candidate;
        else {
          push();
          if (w.length > limit) {
            lines.push(w.slice(0, limit));
            const rest = w.slice(limit);
            if (rest) lines.push(rest.slice(0, limit));
          } else current = w;
        }
      }
      if (lines.length >= this.maxLabelLines) break;
    }
    if (lines.length < this.maxLabelLines && current) push();

    // elipsis si se quedó texto fuera
    if (lines.length >= this.maxLabelLines) {
      const joined = lines.join(' ');
      if (joined.length < label.trim().length) {
        lines[this.maxLabelLines - 1] =
          lines[this.maxLabelLines - 1].replace(/\.*$/, '') + '…';
      }
      return lines.slice(0, this.maxLabelLines);
    }
    return lines;
  }

  /** X/Y del bloque de etiqueta multilínea */
  labelX(): number {
    return this.padding;
  }
  labelBlockY(i: number, label: string): number {
    const lines = this.wrapLabel(label).length || 1;
    // centra verticalmente el bloque de líneas dentro de la barra
    const textBlockHeight =
      this.labelFontSize + (lines - 1) * this.labelLineHeight;
    return (
      this.barY(i) +
      (this.barHeight - textBlockHeight) / 2 +
      this.labelFontSize * 0.8
    );
  }

  /** X del valor al final de la barra */
  valueX(value: number): number {
    return this.barX() + this.barWidth(value) + 6;
  }
}
