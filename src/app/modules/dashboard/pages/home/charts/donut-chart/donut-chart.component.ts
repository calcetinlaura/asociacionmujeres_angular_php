import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component, Input } from '@angular/core';
import {
  ChartColors,
  PALETTE_PASTEL,
} from 'src/app/core/interfaces/general.interface';
import {
  DictTranslatePipe,
  DictType,
} from 'src/app/shared/pipe/dict-translate.pipe';
import { EurosFormatPipe } from '../../../../../../shared/pipe/eurosFormat.pipe';

export type PieDatum = { label: string; value: number };

@Component({
  selector: 'app-donut-chart',
  standalone: true,
  imports: [CommonModule, DictTranslatePipe, EurosFormatPipe],
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

  @Input() labelType?: DictType = DictType.General;
  @Input() labelNormalize: 'upper' | 'lower' | false = false;
  @Input() title = 'Donut';
  @Input() euro = false;
  @Input() showTotal: boolean = true;
  @Input() size = 220; // lado del SVG (px)
  @Input() ring = 24;
  @Input() padAngle = 0.02;
  @Input() emptyColor = '#D1D5DB'; // gris
  @Input() emptyOpacity = 0.9;
  /** Ancho de la leyenda a la izquierda (px) */
  @Input() legendWidth = 240;

  @Input() colors: ChartColors = PALETTE_PASTEL;

  /** Color del donut vacío */

  dictType = DictType;

  total(): number {
    return this._data.reduce((s, d) => s + (d.value || 0), 0);
  }

  /** No hay datos o el total es 0 */
  isEmpty(): boolean {
    return this._data.length === 0 || this.total() === 0;
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

  /** radio para dibujar el donut vacío con stroke */
  get rEmpty() {
    return (this.rOuter + this.rInner) / 2;
  }

  /** grosor del stroke para el donut vacío */
  get emptyStrokeWidth() {
    return this.rOuter - this.rInner;
  }

  pct(v: number) {
    const t = this.total();
    return t ? Math.round((v / t) * 100) : 0;
  }
}
