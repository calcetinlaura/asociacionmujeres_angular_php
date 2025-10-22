import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component, Input } from '@angular/core';
import {
  ChartColors,
  PALETTE_PASTEL,
} from 'src/app/core/interfaces/general.interface';
import { EurosFormatPipe } from '../../../../../../shared/pipe/eurosFormat.pipe';

export type PieDatum = { label: string; value: number };

// ---- Tipos internos ----
type ArcConnector = {
  x1: number;
  y1: number; // centroide
  x2: number;
  y2: number; // borde del círculo
  x3: number;
  y3: number; // borde de la caja (anclaje)
};
type ArcLabelBox = { x: number; y: number; w: number; h: number };
type ArcTextPos = { cx: number; y1: number; y2: number; y3: number };

type ArcItem = {
  i: number;
  start: number;
  end: number;
  color: string;
  value: number;
  label: string;
  connector: ArcConnector;
  box: ArcLabelBox;
  text: ArcTextPos;
};

@Component({
  selector: 'app-cheese-chart',
  standalone: true,
  imports: [CommonModule, EurosFormatPipe],
  templateUrl: './cheese-chart.component.html',
  styleUrls: ['./cheese-chart.component.css'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CheeseChartComponent {
  // ---------- Inputs ----------
  private _data: PieDatum[] = [];
  @Input() set data(v: PieDatum[] | null | undefined) {
    this._data = (v ?? []).filter((d) => d && typeof d.value === 'number');
  }
  get data() {
    return this._data;
  }

  @Input() title = 'Cheese chart';
  /** Lado del área de pastel (sin contar márgenes) */
  @Input() size = 240;
  @Input() euro = false;
  @Input() showTotal: boolean = true;
  /** Separación angular entre porciones (rad) */
  @Input() padAngle = 0.02;
  /** Distancia de las etiquetas al borde del círculo */
  @Input() labelOffset = 32;
  /** Padding interno de la caja de la etiqueta */
  @Input() labelBoxPadding = 6;
  /** Separación mínima vertical entre cajas */
  @Input() labelMinGap = 6;
  /** separación horizontal mínima entre el pastel y la caja (px) */
  @Input() labelSideGap = 12;
  /** Márgenes del lienzo para que quepan las etiquetas */
  @Input() margin = { top: 40, right: 40, bottom: 40, left: 40 };
  /** Factor para escalar el radio del pastel (0–1). Útil para que no se corte. */
  @Input() rScale = 0.86;

  @Input() colors: ChartColors = PALETTE_PASTEL;
  @Input() emptyFill = '#f3f4f6'; // gris claro
  @Input() emptyStroke = '#e5e7eb'; // borde suave

  get isEmpty() {
    return this.total() === 0;
  }
  // ---------- Geometría base ----------
  get outerWidth() {
    return this.size + this.margin.left + this.margin.right;
  }
  get outerHeight() {
    return this.size + this.margin.top + this.margin.bottom;
  }
  get cx() {
    return this.margin.left + this.size / 2;
  }
  get cy() {
    return this.margin.top + this.size / 2;
  }
  get rOuter() {
    return (this.size / 2 - 6) * this.rScale;
  }

  total(): number {
    return this._data.reduce((s, d) => s + (d.value || 0), 0);
  }
  pct(v: number) {
    const t = this.total();
    return t ? Math.round((v / t) * 100) : 0;
  }
  private enforceHorizontalClearance(a: {
    box: ArcLabelBox;
    rightSide: boolean;
    w: number;
    h: number;
    text: ArcTextPos;
    connector: ArcConnector;
  }) {
    const r = this.rOuter;
    const innerLimitLeft = this.cx - r - this.labelSideGap; // borde derecho de cajas a la izq.
    const innerLimitRight = this.cx + r + this.labelSideGap; // borde izq.  de cajas a la dcha.

    if (a.rightSide) {
      // la X interna de la caja es a.box.x (borde izq.)
      const delta = innerLimitRight - a.box.x;
      if (delta > 0) a.box.x += delta; // empuja a la derecha
    } else {
      // la X interna es a.box.x + a.w (borde dcho.)
      const innerEdge = a.box.x + a.w;
      const delta = innerEdge - innerLimitLeft;
      if (delta > 0) a.box.x -= delta; // empuja a la izquierda
    }

    // Recalcular centro de texto y punto de anclaje del conector en el borde de la caja
    a.text.cx = a.box.x + a.w / 2;
    a.connector.x3 = a.rightSide ? a.box.x : a.box.x + a.w;
  }
  private approxTextWidth(text: string, fontSize = 12) {
    return (text?.length ?? 0) * fontSize * 0.62;
  }
  private clamp(v: number, lo: number, hi: number) {
    return Math.max(lo, Math.min(hi, v));
  }
  private get labelsTop() {
    return this.margin.top + 4;
  }
  private get labelsBottom() {
    return this.outerHeight - this.margin.bottom - 4;
  }

  /** Sector (quesito) */
  piePath(cx: number, cy: number, r: number, a0: number, a1: number) {
    if (a1 <= a0) return '';
    const x0 = cx + r * Math.cos(a0);
    const y0 = cy + r * Math.sin(a0);
    const x1 = cx + r * Math.cos(a1);
    const y1 = cy + r * Math.sin(a1);
    const largeArc = (a1 - a0) % (2 * Math.PI) > Math.PI ? 1 : 0;
    return [
      `M ${cx} ${cy}`,
      `L ${x0} ${y0}`,
      `A ${r} ${r} 0 ${largeArc} 1 ${x1} ${y1}`,
      'Z',
    ].join(' ');
  }

  /** Arcos + conectores + cajas + posiciones de texto con anti-solape */
  arcs(): ArcItem[] {
    const total = this.total();
    if (!total) return [];
    let a0 = -Math.PI / 2; // 12 en punto

    const raw: (ArcItem & {
      rightSide: boolean;
      ly: number;
      lx: number;
      w: number;
      h: number;
    })[] = [];

    // 1) Construcción inicial
    this._data.forEach((d, i) => {
      const frac = (d.value || 0) / total;
      const sweep = Math.max(frac * 2 * Math.PI - this.padAngle, 0);
      const start = a0;
      const end = a0 + sweep;
      a0 = end + this.padAngle;

      const mid = (start + end) / 2;
      const r = this.rOuter;

      // Conector: centroide -> borde
      const xCentroid = this.cx + Math.cos(mid) * r * 0.7;
      const yCentroid = this.cy + Math.sin(mid) * r * 0.7;
      const xEdge = this.cx + Math.cos(mid) * r;
      const yEdge = this.cy + Math.sin(mid) * r;
      // Base de etiqueta
      const angle = Math.max(end - start, 0);
      const extraOffset =
        angle < 0.25
          ? 14 // < ~14°
          : angle < 0.5
          ? 8
          : 0; // < ~29°
      const labelRadius = r + this.labelOffset + extraOffset;
      const lx = this.cx + Math.cos(mid) * labelRadius;
      const ly = this.cy + Math.sin(mid) * labelRadius;
      const rightSide = Math.cos(mid) >= 0;

      // Caja estimada (3 líneas)
      const fsName = 12,
        fsTot = 12,
        fsPct = 11,
        gap = 2,
        pad = this.labelBoxPadding;
      const line1 = d.label ?? '';
      const line2 = String(d.value ?? 0);
      const line3 = `${this.pct(d.value)}%`;

      const w =
        Math.max(
          this.approxTextWidth(line1, fsName),
          this.approxTextWidth(line2, fsTot),
          this.approxTextWidth(line3, fsPct)
        ) +
        pad * 2;

      const h = fsName + fsTot + fsPct + gap * 2 + pad * 2;

      const xBox = rightSide ? lx : lx - w;
      const yBox = ly - h / 2;
      const color = this.colors[i % this.colors.length];

      raw.push({
        i,
        start,
        end,
        color,
        value: d.value,
        label: d.label,
        connector: {
          x1: xCentroid,
          y1: yCentroid,
          x2: xEdge,
          y2: yEdge,
          x3: 0,
          y3: 0,
        },
        box: { x: xBox, y: yBox, w, h },
        text: { cx: xBox + w / 2, y1: 0, y2: 0, y3: 0 },
        rightSide,
        ly,
        lx,
        w,
        h,
      });
    });

    // 2) Anti-solape por columnas
    const left = raw.filter((a) => !a.rightSide).sort((a, b) => a.ly - b.ly);
    const right = raw.filter((a) => a.rightSide).sort((a, b) => a.ly - b.ly);

    const adjustColumn = (col: typeof raw) => {
      if (!col.length) return;

      // Orden natural por posición ideal
      col.sort((a, b) => a.ly - b.ly);

      // 1) Posición ideal (centrada en ly) dentro de límites
      for (const a of col) {
        a.box.y = this.clamp(
          a.ly - a.h / 2,
          this.labelsTop,
          this.labelsBottom - a.h
        );
      }

      // 2) Pasada de arriba a abajo: elimina solapes empujando hacia abajo
      for (let i = 1; i < col.length; i++) {
        const prev = col[i - 1];
        const cur = col[i];
        const minY = prev.box.y + prev.h + this.labelMinGap;
        if (cur.box.y < minY) cur.box.y = minY;
      }

      // 3) Pasada de abajo a arriba: reequilibra dentro del límite inferior
      if (col.length) {
        const last = col[col.length - 1];
        if (last.box.y + last.h > this.labelsBottom) {
          // desplazamiento necesario para que el último entre
          let shift = last.box.y + last.h - this.labelsBottom;
          for (let i = col.length - 1; i >= 0; i--) {
            col[i].box.y = Math.max(this.labelsTop, col[i].box.y - shift);
            // si rompemos el gap hacia arriba, aumentamos shift
            if (i > 0) {
              const minY = col[i - 1].box.y + col[i - 1].h + this.labelMinGap;
              if (col[i].box.y < minY) {
                shift += minY - col[i].box.y;
                col[i].box.y = minY;
              }
            }
          }
        }
      }

      // 4) Recalcula anclajes y líneas de texto
      for (const a of col) {
        a.connector.x3 = a.rightSide ? a.box.x : a.box.x + a.w;
        a.connector.y3 = a.box.y + a.h / 2;

        const pad = this.labelBoxPadding;
        const fsName = 12,
          fsTot = 12,
          fsPct = 11,
          gap = 2;
        a.text.cx = a.box.x + a.w / 2;
        a.text.y1 = a.box.y + pad + fsName;
        a.text.y2 = a.text.y1 + gap + fsTot;
        a.text.y3 = a.text.y2 + gap + fsPct;

        // 👇 NUEVO: despeje lateral respecto al círculo
        this.enforceHorizontalClearance(a);
      }
    };
    adjustColumn(left);
    adjustColumn(right);

    // 3) Resultado final (sin campos extra)
    return [...left, ...right].map((a) => ({
      i: a.i,
      start: a.start,
      end: a.end,
      color: a.color,
      value: a.value,
      label: a.label,
      connector: a.connector,
      box: a.box,
      text: a.text,
    }));
  } /** Bounding box que engloba todo: área base + cajas de etiquetas */
  get bounds() {
    const ow = this.outerWidth;
    const oh = this.outerHeight;
    let minX = 0,
      minY = 0,
      maxX = ow,
      maxY = oh;

    // Ojo: llamar a arcs() aquí es barato (pocos segmentos)
    const items = this.arcs();
    for (const a of items) {
      minX = Math.min(minX, a.box.x - 4);
      minY = Math.min(minY, a.box.y - 4);
      maxX = Math.max(maxX, a.box.x + a.box.w + 4);
      maxY = Math.max(maxY, a.box.y + a.box.h + 4);
    }
    return { x: minX, y: minY, w: maxX - minX, h: maxY - minY };
  }

  /** String del viewBox ajustado al contenido */
  vbString() {
    const b = this.bounds;
    return `${b.x} ${b.y} ${b.w} ${b.h}`;
  }
}
