import { inject, Injectable, signal } from '@angular/core';
import { toObservable } from '@angular/core/rxjs-interop';
import {
  catchError,
  combineLatest,
  distinctUntilChanged,
  forkJoin,
  map,
  Observable,
  of,
  shareReplay,
  startWith,
  switchMap,
} from 'rxjs';

import { EventModelFullData } from '../core/interfaces/event.interface';
import {
  AnalyticsService,
  PieDatum,
  YearCount,
} from '../core/services/analytics.service';
import { BooksService } from '../core/services/books.services';
import { EventsService } from '../core/services/events.services';
import { MoviesService } from '../core/services/movies.services';
import { PartnersService } from '../core/services/partners.services';
import { RecipesService } from '../core/services/recipes.services';
import { LoadState, withLoading } from '../shared/utils/loading.operator';
import { EventsFacade } from './events.facade';

type YearFilter = number | 'historic';
export type PeriodicVariant = 'latest' | 'all';

export interface PartnersKpis {
  totalHistorico: number;
  totalAnualActual: number;
  edadMedia?: number;
  tiempoMedio?: string;
}

export interface HBarDatum {
  label: string;
  value: number;
}

@Injectable({ providedIn: 'root' })
export class DashboardFacade {
  // ── Inyecciones ───────────────────────────────────────────────────────────────
  private readonly eventsFacade = inject(EventsFacade);
  private readonly eventsService = inject(EventsService);
  private readonly booksService = inject(BooksService);
  private readonly moviesService = inject(MoviesService);
  private readonly recipesService = inject(RecipesService);
  private readonly partnersService = inject(PartnersService);
  private readonly analytics = inject(AnalyticsService);

  // ── Constantes ────────────────────────────────────────────────────────────────
  readonly now = new Date();
  readonly currentYear = this.now.getFullYear();
  readonly START_YEAR = 2018;
  readonly years = Array.from(
    { length: this.currentYear - this.START_YEAR + 1 },
    (_, i) => this.currentYear - i
  );

  // ── Estado UI (signals) ───────────────────────────────────────────────────────
  readonly year = signal<number>(this.currentYear);
  readonly viewYear = signal<YearFilter>(this.currentYear);
  readonly variant = signal<PeriodicVariant>('latest');
  readonly keyword = signal<string>('');

  // Observables derivados de signals
  private readonly viewYear$ = toObservable(this.viewYear).pipe(
    distinctUntilChanged()
  );
  private readonly variant$ = toObservable(this.variant).pipe(
    distinctUntilChanged()
  );

  // Trigger que provoca "loading" en los gráficos dependientes de año/variant
  private readonly viewTrigger$ = combineLatest([
    this.viewYear$,
    this.variant$,
  ]);

  constructor() {
    this.eventsFacade.loadYearBundle(this.year());
  }

  // ── Helpers ───────────────────────────────────────────────────────────────────
  private toArray$<T>(
    src: Observable<T[] | ReadonlyArray<T> | null | undefined>
  ): Observable<T[]> {
    return src.pipe(
      startWith([] as T[]),
      map((v) => (Array.isArray(v) ? [...v] : []))
    );
  }

  private withLoadingOnChange<T>(
    trigger$: Observable<unknown>,
    data$: Observable<T>
  ): Observable<LoadState<T>> {
    return trigger$.pipe(
      switchMap(() =>
        data$.pipe(
          map((data) => ({ loading: false, data } as LoadState<T>)),
          startWith({
            loading: true,
            data: null as unknown as T,
          } as LoadState<T>),
          catchError((error) =>
            of({ loading: false, error, data: null as unknown as T })
          )
        )
      )
    );
  }

  // ── Fuentes normalizadas desde EventsFacade ───────────────────────────────────
  private readonly visible$ = this.toArray$<EventModelFullData>(
    this.eventsFacade.visibleEvents$
  );
  private readonly all$ = this.toArray$<EventModelFullData>(
    this.eventsFacade.eventsAll$
  );
  private readonly latest$ = this.toArray$<EventModelFullData>(
    this.eventsFacade.eventsNonRepeteatedSubject$
  );

  // ── ViewModel principal ───────────────────────────────────────────────────────
  readonly vm$ = combineLatest<
    [
      EventModelFullData[],
      EventModelFullData[],
      EventModelFullData[],
      number,
      PeriodicVariant
    ]
  >([
    this.visible$,
    this.all$,
    this.latest$,
    toObservable(this.year),
    toObservable(this.variant),
  ]).pipe(
    map(([visible, all, latest, year, variant]) =>
      this.analytics.buildDashboardVM({
        visible,
        all,
        latest,
        year,
        variant,
        keyword: this.keyword(),
      })
    ),
    shareReplay({ bufferSize: 1, refCount: true })
  );

  // ── Eventos para gráficos (respeta viewYear y variant) ────────────────────────
  readonly eventsForCharts$ = combineLatest([
    this.viewYear$,
    this.variant$,
  ]).pipe(
    switchMap(([vy, variant]) => {
      if (vy === 'historic') {
        return forkJoin(
          this.years.map((y) =>
            this.eventsService
              .getEventsByYear(y, variant)
              .pipe(catchError(() => of([])))
          )
        ).pipe(map((lists) => lists.flat()));
      }
      return this.eventsService
        .getEventsByYear(vy as number, variant)
        .pipe(catchError(() => of([])));
    }),
    shareReplay({ bufferSize: 1, refCount: true })
  );

  // ── Streams derivados para charts ─────────────────────────────────────────────
  readonly eventsByMonthForChart$ = this.eventsForCharts$.pipe(
    map((list) => this.analytics.countByMonth(list)),
    shareReplay({ bufferSize: 1, refCount: true })
  );

  readonly eventsByPlaceForChart$ = this.eventsForCharts$.pipe(
    map((list) => this.analytics.countByPlace(list)), // debe devolver { label, value }[]
    shareReplay({ bufferSize: 1, refCount: true })
  );

  readonly annual$ = combineLatest([of(this.years), this.variant$]).pipe(
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
    map((arr) => arr.sort((a, b) => a.year - b.year)),
    shareReplay({ bufferSize: 1, refCount: true })
  );

  // ── Pies (donut) ─────────────────────────────────────────────────────────────
  readonly eventsByAccessYear$ = this.eventsForCharts$.pipe(
    map((list) => this.analytics.groupEventsByAccess(list)), // PieDatum[]
    shareReplay({ bufferSize: 1, refCount: true })
  );

  readonly eventsByCategoryYear$ = this.eventsForCharts$.pipe(
    map((list) => this.analytics.groupEventsByCategory(list)), // PieDatum[]
    shareReplay({ bufferSize: 1, refCount: true })
  );

  readonly booksByGenreYear$ = this.analytics.pieByYearOrHistoric({
    viewYear$: this.viewYear$,
    years: this.years,
    fetchYear: (y) => this.booksService.getBooksByYear(y),
    group: this.analytics.groupBooksByGender,
  });

  readonly moviesByGenreYear$ = this.analytics.pieByYearOrHistoric({
    viewYear$: this.viewYear$,
    years: this.years,
    fetchYear: (y) => this.moviesService.getMoviesByYear(y),
    group: this.analytics.groupMoviesByGender,
  });

  readonly recipesByCategoryYear$ = this.analytics.pieByYearOrHistoric({
    viewYear$: this.viewYear$,
    years: this.years,
    fetchYear: (y) => this.recipesService.getRecipesByYear(y),
    group: this.analytics.groupRecipesByCategory,
  });

  readonly membersAnnual$ = this.partnersService.getPartners().pipe(
    map((partners) =>
      this.analytics.countMembersByYear(partners, 1995, this.currentYear)
    ),
    shareReplay({ bufferSize: 1, refCount: true })
  );

  // ── Estados con "loading al cambiar" (spinner entre cambios) ─────────────────
  readonly eventsByMonthState$: Observable<
    LoadState<Array<{ month: number; count: number }>>
  > = this.withLoadingOnChange(this.viewTrigger$, this.eventsByMonthForChart$);

  // Si countByPlace ya devuelve {label,value}, no hace falta map adicional:
  readonly eventsByPlaceHBar$ = this.eventsByPlaceForChart$;
  readonly eventsByPlaceHBarState$: Observable<LoadState<HBarDatum[]>> =
    this.withLoadingOnChange(this.viewTrigger$, this.eventsByPlaceHBar$);

  readonly eventsByAccessYearState$: Observable<LoadState<PieDatum[]>> =
    this.withLoadingOnChange(this.viewTrigger$, this.eventsByAccessYear$);

  readonly eventsByCategoryYearState$: Observable<LoadState<PieDatum[]>> =
    this.withLoadingOnChange(this.viewTrigger$, this.eventsByCategoryYear$);

  // Estos no dependen de viewYear/variant (o no necesitas spinner entre cambios):
  readonly annualState$: Observable<
    LoadState<{ year: number; count: number }[]>
  > = withLoading(this.annual$);

  readonly booksByGenreYearState$: Observable<LoadState<PieDatum[]>> =
    withLoading(this.booksByGenreYear$);

  readonly moviesByGenreYearState$: Observable<LoadState<PieDatum[]>> =
    withLoading(this.moviesByGenreYear$);

  readonly recipesByCategoryYearState$: Observable<LoadState<PieDatum[]>> =
    withLoading(this.recipesByCategoryYear$);

  readonly membersAnnualState$: Observable<LoadState<YearCount[]>> =
    withLoading(this.membersAnnual$);

  // KPIs de socias
  readonly partnersKpis$ = this.membersAnnual$.pipe(
    map((arr) => {
      const totalHistorico = arr.reduce((acc, it) => acc + (it?.count ?? 0), 0);
      const totalAnualActual =
        arr.find((it) => it.year === this.currentYear)?.count ?? 0;
      return { totalHistorico, totalAnualActual } as PartnersKpis;
    }),
    shareReplay({ bufferSize: 1, refCount: true })
  );

  readonly partnersKpisState$: Observable<LoadState<PartnersKpis>> =
    withLoading(this.partnersKpis$);

  // ── Métodos públicos (UI) ─────────────────────────────────────────────────────
  changeYear(v: number | 'historic') {
    this.viewYear.set(v === 'historic' ? 'historic' : Number(v));
    if (v !== 'historic') {
      const yy = Number(v);
      this.year.set(yy);
      this.eventsFacade.loadYearBundle(yy);
    }
  }

  changeVariant(v: PeriodicVariant) {
    this.variant.set(v);
    this.eventsFacade.loadEventsByYear(this.year(), v);
  }

  search(word: string) {
    this.keyword.set(word.trim());
    this.eventsFacade.applyFilterWord(this.keyword());
  }

  clearSearch() {
    this.search('');
  }
}
