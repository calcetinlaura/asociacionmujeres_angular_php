import { CommonModule } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  inject,
  signal,
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import {
  catchError,
  combineLatest,
  forkJoin,
  map,
  Observable,
  of,
  switchMap,
} from 'rxjs';
import {
  EventsFacade,
  PeriodicVariant,
} from 'src/app/application/events.facade';
import { EventModelFullData } from 'src/app/core/interfaces/event.interface';
import { EventsService } from 'src/app/core/services/events.services';
import { ChartCardComponent } from './charts/components/chart-card/chart-card';
import { HorizontalBarChartComponent } from './charts/horizontal-bar-chart/horizontal-bar-chart';
import { MonthlyChartComponent } from './charts/monthly-chart/monthly-chart.component';

// ========= Helpers de fecha =========
function toDate(v: unknown): Date | null {
  if (!v) return null;
  const d = new Date(v as string | number | Date);
  return isNaN(d.getTime()) ? null : d;
}
function monthIdx(d: Date): number {
  return d.getMonth();
}
function weekOfYear(d: Date): number {
  // ISO week number (aprox., suficiente para gráfica)
  const tmp = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
  const dayNum = tmp.getUTCDay() || 7; // 1..7 (domingo=7)
  tmp.setUTCDate(tmp.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(tmp.getUTCFullYear(), 0, 1));
  const diffDays =
    Math.floor((tmp.getTime() - yearStart.getTime()) / 86400000) + 1;
  return Math.ceil(diffDays / 7);
}

// Nombre del espacio (ajusta a tu modelo si usas otra propiedad)
function getPlaceName(e: EventModelFullData): string {
  const any = e as any;
  return (
    any.place?.name ||
    any.place_name ||
    any.place ||
    any.place_title ||
    (any.place_id != null ? `Espacio #${any.place_id}` : 'Sin espacio')
  );
}

export type DashboardVM = {
  year: number;
  variant: PeriodicVariant; // 'latest' (no repetidos) o 'all'
  visible: EventModelFullData[];
  all: EventModelFullData[];
  latest: EventModelFullData[];
  kpis: {
    total: number;
    unicos: number;
    repetidos: number;
    promedioMes: number;
    proximoEvento?: { title: string; date: Date } | null;
  };
  charts: {
    byMonth: { month: number; count: number }[]; // 0..11
    byWeek: { week: number; count: number }[]; // 1..53 aprox
    uniqueVsRepeated: { label: string; value: number }[];
    byPlace: { label: string; value: number }[]; // <-- NUEVO
  };
};

@Component({
  selector: 'app-home-page',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    MonthlyChartComponent,
    HorizontalBarChartComponent,
    ChartCardComponent,
  ],
  templateUrl: './home-page.component.html',
  styleUrls: ['./home-page.component.css'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class HomePageComponent {
  // Exponer Math al template para usar Math.max, etc.
  readonly Math = Math;
  private readonly facade = inject(EventsFacade);
  private readonly eventsService = inject(EventsService);

  // Constantes para gráficas SVG
  private static readonly CHART_W = 600;
  private static readonly CHART_XPAD = 20;
  private static readonly CHART_H = 220;
  private static readonly CHART_YSPAN = 180; // alto útil

  // Estado UI
  readonly now = new Date();
  readonly currentYear = this.now.getFullYear();
  readonly years = Array.from({ length: 6 }, (_, i) => this.currentYear - i); // año actual y 5 anteriores
  readonly year = signal<number>(this.currentYear);
  readonly variant = signal<PeriodicVariant>('latest');
  readonly keyword = signal<string>('');

  constructor() {
    // Carga inicial del bundle para tener ambas fuentes en cache
    this.facade.loadYearBundle(this.year());
  }

  onChangeYear(y: number) {
    const val = Number(y);
    this.year.set(val);
    // recarga ambas listas para gráficos ágiles
    this.facade.loadYearBundle(val);
  }

  onChangeVariant(v: PeriodicVariant) {
    this.variant.set(v);
    this.facade.loadEventsByYear(this.year(), v);
  }

  onSearch(e: Event) {
    const v = (e.target as HTMLInputElement).value?.trim() || '';
    this.keyword.set(v);
    this.facade.applyFilterWord(v);
  }

  clearSearch() {
    this.keyword.set('');
    this.facade.applyFilterWord('');
  }

  private safe<T>(v: T | null | undefined, fallback: T): T {
    return v ?? fallback;
  }

  // TrackBy para el select de años
  trackByYear = (_: number, y: number) => y;

  // ========= Stream principal de vista =========
  readonly vm$: Observable<DashboardVM> = combineLatest([
    this.facade.visibleEvents$,
    this.facade.eventsAll$,
    this.facade.eventsNonRepeteatedSubject$, // se mantiene el nombre original de la fachada
  ]).pipe(
    map(([visible, all, latest]) => {
      const vis = this.safe(visible, [] as EventModelFullData[]);
      const a = this.safe(all, [] as EventModelFullData[]);
      const l = this.safe(latest, [] as EventModelFullData[]);

      const parseDates = (list: EventModelFullData[]) =>
        list
          .map((e) => ({ e, d: toDate((e as any).start) }))
          .filter((x): x is { e: EventModelFullData; d: Date } => !!x.d);

      // Por mes
      const byMonthCounts = Array.from({ length: 12 }, (_, m) => ({
        month: m,
        count: 0,
      }));
      for (const { d } of parseDates(vis)) {
        byMonthCounts[monthIdx(d)].count++;
      }

      // Por semana
      const weekMap = new Map<number, number>();
      for (const { d } of parseDates(vis)) {
        const w = weekOfYear(d);
        weekMap.set(w, (weekMap.get(w) || 0) + 1);
      }
      const byWeek = Array.from(weekMap.entries())
        .sort((a, b) => a[0] - b[0])
        .map(([week, count]) => ({ week, count }));

      // Únicos / repetidos: latest = no repetidos; repetidos = all - latest
      const unicos = l.length;
      const total = a.length; // ya tenemos fallback a []
      const repetidos = Math.max(total - unicos, 0);
      const promedioMes = total ? +(total / 12).toFixed(1) : 0;

      // Próximo evento (en visible): fecha >= hoy
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const next = parseDates(vis)
        .filter((x) => x.d >= today)
        .sort((x, y) => +x.d - +y.d)[0];

      // --- Agregado anual por espacio (sobre 'all') ---
      const byPlaceMap = new Map<string, number>();
      for (const ev of a) {
        const key = getPlaceName(ev) || 'Sin espacio';
        byPlaceMap.set(key, (byPlaceMap.get(key) || 0) + 1);
      }
      const byPlace = Array.from(byPlaceMap.entries())
        .map(([label, value]) => ({ label, value }))
        .sort((x, y) => y.value - x.value); // mayor a menor

      return {
        year: this.year(),
        variant: this.variant(),
        visible: vis,
        all: a,
        latest: l,
        kpis: {
          total,
          unicos,
          repetidos,
          promedioMes,
          proximoEvento: next
            ? { title: (next.e as any).title || 'Evento', date: next.d }
            : null,
        },
        charts: {
          byMonth: byMonthCounts,
          byWeek,
          uniqueVsRepeated: [
            { label: 'Únicos', value: unicos },
            { label: 'Repetidos', value: repetidos },
          ],
          byPlace, // <-- NUEVO
        },
      } as DashboardVM;
    })
  );

  // ========= Utilidades para las gráficas SVG =========
  // Genera el string 'x,y x,y ...' para el <polyline>
  linePointsWeeks(data: { count: number }[], ymax: number): string {
    if (!data || !data.length || !ymax) return '';
    const n = data.length;
    const denom = Math.max(1, n - 1);
    let points = '';
    for (let i = 0; i < n; i++) {
      const x =
        HomePageComponent.CHART_XPAD + i * (HomePageComponent.CHART_W / denom);
      const y =
        HomePageComponent.CHART_H -
        (data[i].count / ymax) * HomePageComponent.CHART_YSPAN;
      points += (i === 0 ? '' : ' ') + x + ',' + y;
    }
    return points;
  }

  // Máximo de una colección de {count}
  maxCount(
    arr:
      | ReadonlyArray<{ count: number }>
      | { count: number }[]
      | null
      | undefined
  ): number {
    if (!arr || (arr as any).length === 0) return 0;
    const a = arr as { count: number }[];
    return a.reduce((m, x) => Math.max(m, x.count ?? 0), 0);
  }

  // Donut (devolver path SVG)
  donutPath(
    cx: number,
    cy: number,
    r: number,
    startAngle: number,
    endAngle: number
  ) {
    // ángulos en radianes
    const sx = cx + r * Math.cos(startAngle);
    const sy = cy + r * Math.sin(startAngle);
    const ex = cx + r * Math.cos(endAngle);
    const ey = cy + r * Math.sin(endAngle);
    const largeArc = endAngle - startAngle > Math.PI ? 1 : 0;
    return `M ${cx} ${cy} L ${sx} ${sy} A ${r} ${r} 0 ${largeArc} 1 ${ex} ${ey} Z`;
  }

  // Línea (escala simple)
  linePath(points: { x: number; y: number }[]) {
    if (!points.length) return '';
    return points.map((p, i) => `${i ? 'L' : 'M'} ${p.x} ${p.y}`).join(' ');
  }

  // Serie anual para sparklines, etc.
  readonly annual$: Observable<{ year: number; count: number }[]> = of(
    this.years
  ).pipe(
    switchMap((ys) =>
      forkJoin(
        ys.map((y) =>
          this.eventsService.getEventsByYear(y, 'all').pipe(
            map((list) => ({ year: y, count: (list ?? []).length })),
            catchError(() => of({ year: y, count: 0 }))
          )
        )
      )
    ),
    map((arr) => arr.sort((a, b) => a.year - b.year))
  );
}
