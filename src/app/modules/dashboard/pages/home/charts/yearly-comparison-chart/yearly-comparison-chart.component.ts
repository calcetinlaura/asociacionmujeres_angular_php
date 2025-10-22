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
import { EurosFormatPipe } from '../../../../../../shared/pipe/eurosFormat.pipe';

export interface YearlyDatum {
  year: number;
  ingresos: number;
  gastosFacturas: number;
  gastosTickets: number;
  subvenciones: number;
}

@Component({
  selector: 'app-yearly-comparison-chart',
  standalone: true,
  imports: [CommonModule, EurosFormatPipe],
  templateUrl: './yearly-comparison-chart.component.html',
  styleUrls: ['./yearly-comparison-chart.component.css'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class YearlyComparisonChartComponent
  implements AfterViewInit, OnDestroy
{
  // === Inputs ================================================================
  @Input({ required: true }) data: YearlyDatum[] = [];
  @Input() width = 940;
  @Input() euro = false;

  // === Constantes de layout ===================================================
  readonly canvasWidth = 1100; // más ancho
  readonly canvasHeight = 350; // igual o un poco más bajo

  readonly left = 40; // margen más estrecho
  readonly right = 40; // margen más estrecho
  readonly bottom = 80;
  readonly top = 40;

  readonly barWidth = 80; // más gruesas
  readonly barGap = 20; // distancia entre barras de un mismo grupo
  readonly barGroupGap = 28;

  // Altura mínima (px SVG) para mostrar etiqueta dentro de un segmento
  readonly minLabelHeight = 18;

  // === Referencias ===========================================================
  @ViewChild('wrapEl', { static: true }) wrapEl!: ElementRef<HTMLDivElement>;

  private ro?: ResizeObserver;
  private _scale = 1;

  // === Escalado responsivo ====================================================
  get scale() {
    return this._scale;
  }
  get effTickFont() {
    return 14 / this._scale;
  }
  get effValueFont() {
    return 14 / this._scale;
  }
  get effSmallFont() {
    return 12 / this._scale;
  }

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

  // === Dimensiones útiles =====================================================
  get usableWidth() {
    return this.canvasWidth - this.left - this.right;
  }
  get usableHeight() {
    return this.canvasHeight - this.top - this.bottom;
  }

  // === Valores máximos ========================================================
  get maxValue() {
    const allValues = this.data.flatMap((d) => [
      d.ingresos + d.subvenciones, // barra izquierda apilada
      d.gastosFacturas + d.gastosTickets, // barra derecha apilada
    ]);
    return Math.max(...allValues, 1);
  }

  // === Colores ================================================================
  colors = {
    ingresos: '#dba4f1',
    subvenciones: '#b7d3ff',
    gastosFacturas: '#b7f0d8',
    gastosTickets: '#ffe3a3',
  };

  // === Helpers ================================================================
  /** Ancho de cada grupo (dos barras + hueco entre ellas) */
  get groupWidth() {
    return this.barWidth * 2 + this.barGap;
  }
}
