import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component, Input } from '@angular/core';

export type AnnualPoint = { year: number; count: number };

@Component({
  selector: 'app-annual-line-chart',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './annual-line-chart.component.html',
  styleUrls: ['./annual-line-chart.component.css'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AnnualLineChartComponent {
  /** Serie anual: [{year, count}] (se ordena por año) */
  private _data: AnnualPoint[] = [];
  @Input() set data(v: AnnualPoint[] | null | undefined) {
    this._data = (v ?? []).slice().sort((a, b) => a.year - b.year);
  }
  get data(): AnnualPoint[] {
    return this._data;
  }

  /** Título/aria */
  @Input() title = 'Eventos por año';
  @Input() subtitle = '';

  /** Dimensiones internas (altura reducida) */
  @Input() innerWidth = 600;
  @Input() innerHeight = 110;

  /** Márgenes compactos */
  @Input() margin = { top: 6, right: 12, bottom: 18, left: 28 };

  /** Nº de líneas horizontales de referencia */
  @Input() yGridLines = 3;

  /** Modo compacto (tipos/dots/anchos pequeños) */
  @Input() compact = true;

  /** Formateador de Y (tooltip/labels) */
  @Input() formatY = (v: number) => `${v}`;

  // ---- derivadas
  get outerWidth() {
    return this.innerWidth + this.margin.left + this.margin.right;
  }
  get outerHeight() {
    return this.innerHeight + this.margin.top + this.margin.bottom;
  }
  get maxCount(): number {
    const arr = this._data ?? [];
    return arr.reduce((m, d) => Math.max(m, d?.count || 0), 0);
  }
  get isEmpty(): boolean {
    return (this._data?.length ?? 0) === 0;
  }

  /** Escalas sencillas (años equidistantes) */
  x(i: number): number {
    const n = this._data?.length ?? 0;
    const denom = Math.max(1, n - 1);
    return this.margin.left + (i * this.innerWidth) / denom;
  }
  y(v: number): number {
    const ymax = Math.max(1, this.maxCount); // evita div/0
    return this.margin.top + (1 - v / ymax) * this.innerHeight;
  }

  /** Y para la etiqueta encima del punto (con clamp para no cortar arriba) */
  labelY(v: number): number {
    const y = this.y(v) - 6; // 6px por encima del punto
    const minY = this.margin.top + 6;
    return Math.max(minY, y);
  }

  /** Polilínea de la serie */
  pointsAttr(): string {
    const arr = this._data ?? [];
    if (!arr.length) return '';
    const ymax = Math.max(1, this.maxCount);
    const n = arr.length;
    const denom = Math.max(1, n - 1);
    let s = '';
    for (let i = 0; i < n; i++) {
      const px = this.margin.left + (i * this.innerWidth) / denom;
      const py =
        this.margin.top + (1 - (arr[i]?.count ?? 0) / ymax) * this.innerHeight;
      s += (i ? ' ' : '') + px + ',' + py;
    }
    return s;
  }

  /** Ticks Y (0..max) */
  yTicks(): { v: number; y: number }[] {
    const ticks: { v: number; y: number }[] = [];
    const steps = Math.max(1, this.yGridLines);
    const ymax = this.maxCount;
    for (let i = 0; i <= steps; i++) {
      const v = Math.round((ymax * i) / steps);
      ticks.push({ v, y: this.y(v) });
    }
    return ticks;
  }

  /** Ticks X: todos los años */
  xTicks(): { year: number; x: number }[] {
    const arr = this._data ?? [];
    if (!arr.length) return [];
    return arr.map((d, i) => ({ year: d?.year ?? 0, x: this.x(i) }));
  }
}
