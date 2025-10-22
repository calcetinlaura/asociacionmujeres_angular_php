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
import { YearlyDatum } from '../yearly-comparison-chart/yearly-comparison-chart.component';

@Component({
  selector: 'app-balance-by-year-chart',
  standalone: true,
  imports: [CommonModule, EurosFormatPipe],
  templateUrl: './balance-by-year-chart.component.html',
  styleUrls: ['./balance-by-year-chart.component.css'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class BalanceByYearChartComponent implements AfterViewInit, OnDestroy {
  @Input({ required: true }) data: YearlyDatum[] = [];
  @Input() title = 'Balance anual (ingresos - gastos)';
  @Input() width = 640;
  @Input() euro = false;

  // Helpers para usar en template (en vez de Math.*)
  abs(n: number) {
    return Math.abs(n);
  }
  min(a: number, b: number) {
    return Math.min(a, b);
  }
  max(a: number, b: number) {
    return Math.max(a, b);
  }
  clamp(v: number, lo: number, hi: number) {
    return Math.max(lo, Math.min(hi, v));
  }

  readonly canvasWidth = 640;
  readonly canvasHeight = 350;
  readonly left = 20;
  readonly right = 20;
  readonly bottom = 80;
  readonly top = 40;
  readonly barWidth = 80;
  readonly barGroupGap = 40; // <- la plantilla lo usa
  readonly M = Math;
  valueLabelMargin = 10; // px

  @ViewChild('wrapEl', { static: true }) wrapEl!: ElementRef<HTMLDivElement>;
  private ro?: ResizeObserver;
  private _scale = 1;

  constructor(private zone: NgZone) {}

  ngAfterViewInit(): void {
    this.zone.runOutsideAngular(() => {
      const el = this.wrapEl?.nativeElement;
      if (!el) return;
      this.ro = new ResizeObserver((entries) => {
        const rect = entries[0]?.contentRect;
        if (!rect) return;
        this._scale = Math.max(rect.width / this.canvasWidth, 0.001);
      });
      this.ro.observe(el);
    });
  }

  ngOnDestroy(): void {
    this.ro?.disconnect();
  }

  get usableWidth() {
    return this.canvasWidth - this.left - this.right;
  }
  get usableHeight() {
    return this.canvasHeight - this.top - this.bottom;
  }
  get scale() {
    return this._scale;
  }

  // tamaños de fuente efectivos (si los usas en el template)
  get effTickFont() {
    return 14 / this._scale;
  }
  get effValueFont() {
    return 13 / this._scale;
  }

  // datos para barras
  get balances() {
    return (this.data ?? []).map((d) => ({
      year: d.year,
      balance:
        (d.ingresos ?? 0) +
        (d.subvenciones ?? 0) -
        // si no tienes separados, usa d.gastos; si sí, suma facturas+tickets
        (((d as any).gastosFacturas ?? (d as any).gastos ?? 0) +
          ((d as any).gastosTickets ?? 0)),
    }));
  }

  get maxAbsValue() {
    const vals = this.balances.map((b) => Math.abs(b.balance));
    return Math.max(...vals, 1);
  }

  colors = {
    positivo: 'rgb(183, 240, 216)',
    negativo: 'rgb(255, 184, 193)',
  };
}
