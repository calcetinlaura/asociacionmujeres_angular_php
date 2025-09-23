// donut-chart.component.ts
import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component, Input } from '@angular/core';

export type PieDatum = { label: string; value: number };

@Component({
  selector: 'app-donut-chart',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './donut-chart.component.html',
  styleUrls: ['./donut-chart.component.css'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DonutChartComponent {
  private _data: PieDatum[] = [];
  @Input() set data(v: PieDatum[] | null | undefined) {
    this._data = (v ?? []).filter((d) => d && typeof d.value === 'number');
  }
  get data() {
    return this._data;
  }

  @Input() title = 'Donut';
  @Input() size = 220; // lado del SVG (px)
  @Input() ring = 24;
  @Input() padAngle = 0.02;

  /** Ancho de la leyenda a la izquierda (px) */
  @Input() legendWidth = 240;

  @Input() colors: string[] = [
    '#dba4f1',
    '#b7d3ff',
    '#b7f0d8',
    '#ffe3a3',
    '#f6b7d2',
    '#ffb8c1',
    '#d6c5ff',
    '#c7f5c8',
    '#ffd8a8',
    '#b8ecf2',
  ];

  total(): number {
    return this._data.reduce((s, d) => s + (d.value || 0), 0);
  }

  arcs() {
    const total = this.total();
    if (!total) return [];
    let a0 = -Math.PI / 2;
    return this._data.map((d, i) => {
      const frac = (d.value || 0) / total;
      const a1 = a0 + frac * (2 * Math.PI) - this.padAngle;
      const arc = {
        i,
        label: d.label,
        value: d.value,
        start: a0,
        end: a1,
        color: this.colors[i % this.colors.length],
      };
      a0 = a1 + this.padAngle;
      return arc;
    });
  }

  arcPath(
    cx: number,
    cy: number,
    rOuter: number,
    rInner: number,
    a0: number,
    a1: number
  ) {
    const sx0 = cx + rOuter * Math.cos(a0);
    const sy0 = cy + rOuter * Math.sin(a0);
    const ex0 = cx + rOuter * Math.cos(a1);
    const ey0 = cy + rOuter * Math.sin(a1);
    const sx1 = cx + rInner * Math.cos(a1);
    const sy1 = cy + rInner * Math.sin(a1);
    const ex1 = cx + rInner * Math.cos(a0);
    const ey1 = cy + rInner * Math.sin(a0);
    const largeArc = (a1 - a0) % (2 * Math.PI) > Math.PI ? 1 : 0;
    return [
      `M ${sx0} ${sy0}`,
      `A ${rOuter} ${rOuter} 0 ${largeArc} 1 ${ex0} ${ey0}`,
      `L ${sx1} ${sy1}`,
      `A ${rInner} ${rInner} 0 ${largeArc} 0 ${ex1} ${ey1}`,
      'Z',
    ].join(' ');
  }

  get cx() {
    return this.size / 2;
  }
  get cy() {
    return this.size / 2;
  }
  get rOuter() {
    return this.size / 2 - 4;
  }
  get rInner() {
    return this.rOuter - this.ring;
  }

  pct(v: number) {
    const t = this.total();
    return t ? Math.round((v / t) * 100) : 0;
  }
}
