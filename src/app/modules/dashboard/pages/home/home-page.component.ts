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
  distinctUntilChanged,
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

import { toObservable } from '@angular/core/rxjs-interop';
import { PartnerModel } from 'src/app/core/interfaces/partner.interface';
import { BooksService } from 'src/app/core/services/books.services';
import { MoviesService } from 'src/app/core/services/movies.services';
import { PartnersService } from 'src/app/core/services/partners.services';
import { RecipesService } from 'src/app/core/services/recipes.services';
import { AnnualLineChartComponent } from './charts/annual-line-chart/annual-line-chart.component';
import { CheeseChartComponent } from './charts/cheese-chart/cheese-chart.component';
import { ChartCardComponent } from './charts/components/chart-card/chart-card.component';
import { DonutChartComponent } from './charts/donut-chart/donut-chart.component';
import { HorizontalBarChartComponent } from './charts/horizontal-bar-chart/horizontal-bar-chart.component';
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
  const tmp = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
  const dayNum = tmp.getUTCDay() || 7;
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
  variant: PeriodicVariant;
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
    byMonth: { month: number; count: number }[];
    byWeek: { week: number; count: number }[];
    uniqueVsRepeated: { label: string; value: number }[];
    byPlace: { label: string; value: number }[];
  };
};

// ===== Helpers de quesito =====
export type PieDatum = { label: string; value: number };

function groupBooksByGender(books: any[]): PieDatum[] {
  const mapG = new Map<string, number>();
  for (const b of books ?? []) {
    const g = (b?.gender || 'Sin género') as string;
    mapG.set(g, (mapG.get(g) || 0) + 1);
  }
  return Array.from(mapG.entries())
    .map(([label, value]) => ({ label, value }))
    .sort((a, b) => b.value - a.value);
}

function groupMoviesByGender(movies: any[]): PieDatum[] {
  const mapG = new Map<string, number>();
  for (const m of movies ?? []) {
    const g = (m?.gender || 'Sin género') as string; // ajusta a 'genre' si procede
    mapG.set(g, (mapG.get(g) || 0) + 1);
  }
  return Array.from(mapG.entries())
    .map(([label, value]) => ({ label, value }))
    .sort((a, b) => b.value - a.value);
}

function groupRecipesByCategory(recipes: any[]): PieDatum[] {
  const mapC = new Map<string, number>();
  for (const r of recipes ?? []) {
    const c = (r?.category ??
      r?.categoria ??
      r?.type ??
      'Sin categoría') as string;
    mapC.set(c, (mapC.get(c) || 0) + 1);
  }
  return Array.from(mapC.entries())
    .map(([label, value]) => ({ label, value }))
    .sort((a, b) => b.value - a.value);
}

/** Fusiona varios arrays de PieDatum sumando por etiqueta */
function mergePieData(arrays: PieDatum[][]): PieDatum[] {
  const m = new Map<string, number>();
  for (const arr of arrays) {
    for (const it of arr ?? []) {
      m.set(it.label, (m.get(it.label) || 0) + (it.value || 0));
    }
  }
  return Array.from(m.entries())
    .map(([label, value]) => ({ label, value }))
    .sort((a, b) => b.value - a.value);
}

type YearFilter = number | 'historic';

@Component({
  selector: 'app-home-page',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    MonthlyChartComponent,
    HorizontalBarChartComponent,
    ChartCardComponent,
    CheeseChartComponent,
    AnnualLineChartComponent,
    DonutChartComponent,
  ],
  templateUrl: './home-page.component.html',
  styleUrls: ['./home-page.component.css'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class HomePageComponent {
  // Exponer Math al template
  readonly Math = Math;
  private readonly facade = inject(EventsFacade);
  private readonly eventsService = inject(EventsService);
  private readonly booksService = inject(BooksService);
  private readonly moviesService = inject(MoviesService);
  private readonly recipesService = inject(RecipesService);
  private readonly partnersService = inject(PartnersService);

  // Constantes para otras gráficas SVG
  private static readonly CHART_W = 600;
  private static readonly CHART_XPAD = 20;
  private static readonly CHART_H = 220;
  private static readonly CHART_YSPAN = 180;

  // Estado UI
  readonly now = new Date();
  readonly currentYear = this.now.getFullYear();
  readonly START_YEAR = 2018;
  readonly years = Array.from(
    { length: this.currentYear - this.START_YEAR + 1 },
    (_, i) => this.currentYear - i
  );

  /** Año numérico para la sección de eventos (KPI/visible) */
  readonly year = signal<number>(this.currentYear);

  /** Filtro visible para charts: número o 'historic' */
  readonly viewYear = signal<YearFilter>(this.currentYear);
  private readonly viewYear$ = toObservable(this.viewYear);

  readonly variant = signal<PeriodicVariant>('latest');
  private readonly variant$ = toObservable(this.variant);

  readonly keyword = signal<string>('');

  constructor() {
    this.facade.loadYearBundle(this.year());
  }

  // Etiqueta para títulos
  yearLabel(): string {
    const y = this.viewYear();
    return y === 'historic' ? 'Histórico' : String(y);
  }

  onChangeYear(v: number | 'historic') {
    // Filtro global para charts (quesitos + eventos)
    this.viewYear.set(v === 'historic' ? 'historic' : Number(v));

    // Para KPIs y flujos de la fachada seguimos usando año numérico
    if (v !== 'historic') {
      const val = Number(v);
      this.year.set(val);
      this.facade.loadYearBundle(val);
    }
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

  // ========= Stream principal de vista (EVENTOS por año numérico: KPIs, etc.) =========
  readonly vm$: Observable<DashboardVM> = combineLatest([
    this.facade.visibleEvents$,
    this.facade.eventsAll$,
    this.facade.eventsNonRepeteatedSubject$,
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
      for (const { d } of parseDates(vis)) byMonthCounts[monthIdx(d)].count++;

      // Por semana
      const weekMap = new Map<number, number>();
      for (const { d } of parseDates(vis)) {
        const w = weekOfYear(d);
        weekMap.set(w, (weekMap.get(w) || 0) + 1);
      }
      const byWeek = Array.from(weekMap.entries())
        .sort((a, b) => a[0] - b[0])
        .map(([week, count]) => ({ week, count }));

      // Únicos / repetidos
      const unicos = l.length;
      const total = a.length;
      const repetidos = Math.max(total - unicos, 0);
      const promedioMes = total ? +(total / 12).toFixed(1) : 0;

      // Próximo evento
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const next = parseDates(vis)
        .filter((x) => x.d >= today)
        .sort((x, y) => +x.d - +y.d)[0];

      // Por espacio (del año)
      const byPlaceMap = new Map<string, number>();
      for (const ev of a) {
        const key = getPlaceName(ev) || 'Sin espacio';
        byPlaceMap.set(key, (byPlaceMap.get(key) || 0) + 1);
      }
      const byPlace = Array.from(byPlaceMap.entries())
        .map(([label, value]) => ({ label, value }))
        .sort((x, y) => y.value - x.value);

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
          byPlace,
        },
      } as DashboardVM;
    })
  );

  // ========= EVENTOS (datos para CHARTS con opción HISTÓRICO) =========

  /** Lista de eventos para las charts (año elegido o histórico), respetando variant */
  readonly eventsForCharts$: Observable<EventModelFullData[]> = combineLatest([
    this.viewYear$,
    this.variant$,
  ]).pipe(
    switchMap(([vy, variant]) => {
      if (vy === 'historic') {
        return forkJoin(
          this.years.map((y) =>
            this.eventsService
              .getEventsByYear(y, variant)
              .pipe(catchError(() => of([] as EventModelFullData[])))
          )
        ).pipe(map((lists) => lists.flat()));
      }
      return this.eventsService
        .getEventsByYear(vy as number, variant)
        .pipe(catchError(() => of([] as EventModelFullData[])));
    })
  );

  /** Eventos por mes (histórico o anual) para <app-monthly-chart> */
  readonly eventsByMonthForChart$: Observable<
    { month: number; count: number }[]
  > = this.eventsForCharts$.pipe(
    map((list) => {
      const counts = Array.from({ length: 12 }, (_, m) => ({
        month: m,
        count: 0,
      }));
      for (const ev of list ?? []) {
        const d = toDate((ev as any).start);
        if (!d) continue;
        counts[monthIdx(d)].count++;
      }
      return counts;
    })
  );

  /** Eventos por espacio (histórico o anual) para <app-horizontal-bar-chart> */
  readonly eventsByPlaceForChart$: Observable<
    { label: string; value: number }[]
  > = this.eventsForCharts$.pipe(
    map((list) => {
      const m = new Map<string, number>();
      for (const ev of list ?? []) {
        const key = getPlaceName(ev) || 'Sin espacio';
        m.set(key, (m.get(key) || 0) + 1);
      }
      return Array.from(m.entries())
        .map(([label, value]) => ({ label, value }))
        .sort((a, b) => b.value - a.value);
    })
  );

  /** Serie anual (2018..actual) para la línea histórica superior, respetando Únicos/Todos */
  readonly annual$: Observable<{ year: number; count: number }[]> =
    combineLatest([of(this.years), this.variant$]).pipe(
      switchMap(([ys, variant]) =>
        forkJoin(
          ys.map((y) =>
            this.eventsService.getEventsByYear(y, variant).pipe(
              map((list) => ({ year: y, count: (list ?? []).length })),
              catchError(() => of({ year: y, count: 0 }))
            )
          )
        )
      ),
      map((arr) => arr.sort((a, b) => a.year - b.year))
    );

  // ========= QUESITOS (AÑO o HISTÓRICO) =========

  /** Libros por género (año o histórico) */
  readonly booksByGenreYear$: Observable<PieDatum[]> = this.viewYear$.pipe(
    distinctUntilChanged(),
    switchMap((y) => {
      if (y === 'historic') {
        return forkJoin(
          this.years.map((yy) => this.booksService.getBooksByYear(yy))
        ).pipe(
          map((lists) => mergePieData(lists.map(groupBooksByGender))),
          catchError(() => of([]))
        );
      }
      return this.booksService.getBooksByYear(y as number).pipe(
        map(groupBooksByGender),
        catchError(() => of([]))
      );
    })
  );

  /** Películas por género (año o histórico) */
  readonly moviesByGenreYear$: Observable<PieDatum[]> = this.viewYear$.pipe(
    distinctUntilChanged(),
    switchMap((y) => {
      if (y === 'historic') {
        return forkJoin(
          this.years.map((yy) => this.moviesService.getMoviesByYear(yy))
        ).pipe(
          map((lists) => mergePieData(lists.map(groupMoviesByGender))),
          catchError(() => of([]))
        );
      }
      return this.moviesService.getMoviesByYear(y as number).pipe(
        map(groupMoviesByGender),
        catchError(() => of([]))
      );
    })
  );

  /** Recetas por categoría (año o histórico) */
  readonly recipesByCategoryYear$: Observable<PieDatum[]> = this.viewYear$.pipe(
    distinctUntilChanged(),
    switchMap((y) => {
      if (y === 'historic') {
        return forkJoin(
          this.years.map((yy) => this.recipesService.getRecipesByYear(yy))
        ).pipe(
          map((lists) => mergePieData(lists.map(groupRecipesByCategory))),
          catchError(() => of([]))
        );
      }
      return this.recipesService.getRecipesByYear(y as number).pipe(
        map(groupRecipesByCategory),
        catchError(() => of([]))
      );
    })
  );

  // ========= Utilidades para líneas =========
  linePointsYears(
    data: { year: number; count: number }[],
    ymax: number
  ): string {
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

  // Donut (devolver path SVG) – usado por otras vistas
  donutPath(
    cx: number,
    cy: number,
    r: number,
    startAngle: number,
    endAngle: number
  ) {
    const sx = cx + r * Math.cos(startAngle);
    const sy = cy + r * Math.sin(endAngle);
    const ex = cx + r * Math.cos(endAngle);
    const ey = cy + r * Math.sin(endAngle);
    const largeArc = endAngle - startAngle > Math.PI ? 1 : 0;
    return `M ${cx} ${cy} L ${sx} ${sy} A ${r} ${r} 0 ${largeArc} 1 ${ex} ${ey} Z`;
  }

  linePath(points: { x: number; y: number }[]) {
    if (!points.length) return '';
    return points.map((p, i) => `${i ? 'L' : 'M'} ${p.x} ${p.y}`).join(' ');
  } /** Años desde 1995 hasta el actual para la serie de socias */

  readonly memberYears = (() => {
    const start = 1995;
    const end = this.currentYear;
    const out: number[] = [];
    for (let y = start; y <= end; y++) out.push(y);
    return out;
  })();

  /** Serie histórica: total de socias por año (1995..actual) */
  readonly membersAnnual$: Observable<{ year: number; count: number }[]> =
    this.partnersService.getPartners().pipe(
      map((partners) => {
        const safePartners = partners ?? [];
        return this.memberYears.map((y) => {
          const count = safePartners.reduce((acc: number, p: PartnerModel) => {
            const cuotas = Array.isArray(p?.cuotas) ? p.cuotas : [];
            // cuenta si la socia tiene ese año en cuotas
            return acc + (cuotas.includes(y) ? 1 : 0);
          }, 0);
          return { year: y, count };
        });
      })
    );
}
