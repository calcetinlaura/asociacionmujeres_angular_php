import { CommonModule } from '@angular/common';
import {
  AfterViewInit,
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  Input,
  NgZone,
  OnDestroy,
  ViewChild,
} from '@angular/core';

export type MonthBar = { month: number; count: number };

@Component({
  selector: 'app-monthly-chart',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './monthly-chart.component.html',
  styleUrls: ['./monthly-chart.component.css'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class MonthlyChartComponent implements AfterViewInit, OnDestroy {
  // === ÚNICO input de layout: el ancho del contenedor ===
  @Input() width = 940;

  // Datos y título
  @Input({ required: true }) data: MonthBar[] | null = null;
  @Input() title = 'Eventos por mes';

  // === Lienzo lógico fijo (se escala con viewBox) ===
  readonly canvasWidth = 940;
  readonly canvasHeight = 540;

  // Geometría interna (coordenadas del lienzo lógico)
  readonly left = 40;
  readonly right = 40;
  get usableWidth() {
    return this.canvasWidth - this.left - this.right;
  }
  get baseY() {
    return this.canvasHeight - 60;
  } // línea base de las barras
  get usableHeight() {
    return this.canvasHeight - 140;
  } // altura útil de las barras
  readonly separatorOffset = 18; // antes 10 → baja un poco la línea
  readonly labelOffset = 52; // antes 24 → baja las siglas
  readonly valueTopGap = 16; // antes 58 → acerca el número a la barra
  readonly valueFontPx = 80; // tamaño del número en px

  @ViewChild('wrapEl', { static: true }) wrapEl!: ElementRef<HTMLDivElement>;
  @ViewChild('svgEl', { static: true }) svgEl!: ElementRef<SVGSVGElement>;

  // Tamaños deseados en pantalla (px). Se compensan por escala del SVG.
  readonly desiredValueFontPx = 14;
  readonly desiredTickFontPx = 12; // antes 14

  private ro?: ResizeObserver;
  private _scale = 1; // renderedWidth / canvasWidth
  get scale() {
    return this._scale;
  }
  get effTickFont() {
    return this.desiredTickFontPx / this._scale;
  } // unidades SVG
  get effValueFont() {
    return this.desiredValueFontPx / this._scale;
  } // unidades SVG
  get effStroke1() {
    return 1 / this._scale;
  } // para líneas finas

  // Meses
  readonly months = [
    'ENE',
    'FEB',
    'MAR',
    'ABR',
    'MAY',
    'JUN',
    'JUL',
    'AGO',
    'SEP',
    'OCT',
    'NOV',
    'DIC',
  ];

  constructor(private zone: NgZone) {}

  ngAfterViewInit(): void {
    this.zone.runOutsideAngular(() => {
      const el = this.wrapEl?.nativeElement;
      if (!el) return;
      this.ro = new ResizeObserver((entries) => {
        const rect = entries[0]?.contentRect;
        if (!rect) return;
        const renderedWidth = rect.width;
        this._scale = Math.max(renderedWidth / this.canvasWidth, 0.001);
      });
      this.ro.observe(el);
    });
  }

  ngOnDestroy(): void {
    if (this.ro) this.ro.disconnect();
  }

  maxCount(arr: unknown): number {
    if (!Array.isArray(arr) || arr.length === 0) return 0;
    const a = arr as { count: number }[];
    return a.reduce((m, x) => Math.max(m, x?.count ?? 0), 0);
  }
}
