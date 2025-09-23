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
  /** Datos agregados por categoría (género) */
  private _data: PieDatum[] = [];
  @Input() set data(v: PieDatum[] | null | undefined) {
    this._data = (v ?? []).filter((d) => d && typeof d.value === 'number');
  }
  get data() {
    return this._data;
  }

  /** Título opcional para el aria-label */
  @Input() title = 'Donut';

  /** Lado del lienzo interno (viewBox). El SVG ocupa 100% del ancho del contenedor. */
  @Input() size = 220;

  /** Grosor del anillo */
  @Input() ring = 24;

  /** Separación angular entre porciones (radianes) */
  @Input() padAngle = 0.02;

  /** Colores (ciclo) */
  @Input() colors: string[] = [
    '#dba4f1', // base (no tocar)
    '#b7d3ff', // azul pastel
    '#b7f0d8', // menta suave
    '#ffe3a3', // amarillo pastel
    '#f6b7d2', // rosa pastel
    '#ffb8c1', // coral suave
    '#d6c5ff', // lavanda
    '#c7f5c8', // verde pastel
    '#ffd8a8', // melocotón
    '#b8ecf2', // cian pastel
  ];

  total(): number {
    return this._data.reduce((s, d) => s + (d.value || 0), 0);
  }

  /** Estructura lista para pintar con start/end angle */
  arcs() {
    const total = this.total();
    if (!total) return [];
    let a0 = -Math.PI / 2; // arranque arriba
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

  /** Path de arco en coordenadas polares */
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

  /** Coordenadas del centro y radios */
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

  /** % (redondeado) */
  pct(v: number) {
    const t = this.total();
    return t ? Math.round((v / t) * 100) : 0;
  }
}
