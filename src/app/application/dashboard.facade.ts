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
import { AnalyticsService } from '../core/services/analytics.service';
import { BooksService } from '../core/services/books.services';
import { EventsService } from '../core/services/events.services';
import { MoviesService } from '../core/services/movies.services';
import { PartnersService } from '../core/services/partners.services';
import { RecipesService } from '../core/services/recipes.services';
import { EventsFacade } from './events.facade';

type YearFilter = number | 'historic';
export type PeriodicVariant = 'latest' | 'all';
@Injectable({ providedIn: 'root' })
export class DashboardFacade {
  private readonly eventsFacade = inject(EventsFacade);
  private readonly eventsService = inject(EventsService);
  private readonly booksService = inject(BooksService);
  private readonly moviesService = inject(MoviesService);
  private readonly recipesService = inject(RecipesService);
  private readonly partnersService = inject(PartnersService);
  private readonly analytics = inject(AnalyticsService);

  readonly now = new Date();
  readonly currentYear = this.now.getFullYear();
  readonly START_YEAR = 2018;
  readonly years = Array.from(
    { length: this.currentYear - this.START_YEAR + 1 },
    (_, i) => this.currentYear - i
  );

  // Estado UI
  readonly year = signal<number>(this.currentYear);
  readonly viewYear = signal<YearFilter>(this.currentYear);
  readonly variant = signal<PeriodicVariant>('latest');
  readonly keyword = signal<string>('');

  private readonly viewYear$ = toObservable(this.viewYear).pipe(
    distinctUntilChanged()
  );
  private readonly variant$ = toObservable(this.variant).pipe(
    distinctUntilChanged()
  );

  constructor() {
    this.eventsFacade.loadYearBundle(this.year());
  }

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

  // 1) Helper genérico: convierte (T[] | null | undefined) -> T[] y garantiza 1ª emisión
  private toArray$<T>(
    src: Observable<T[] | ReadonlyArray<T> | null | undefined>
  ): Observable<T[]> {
    return src.pipe(
      // aseguras una primera emisión para que combineLatest no se quede esperando
      startWith([] as T[]),
      map((v) => (Array.isArray(v) ? [...v] : []))
    );
  }

  // 2) Normaliza tus 3 streams de eventos
  private readonly visible$ = this.toArray$<EventModelFullData>(
    this.eventsFacade.visibleEvents$
  );
  private readonly all$ = this.toArray$<EventModelFullData>(
    this.eventsFacade.eventsAll$
  );
  private readonly latest$ = this.toArray$<EventModelFullData>(
    this.eventsFacade.eventsNonRepeteatedSubject$
  );

  // 3) Combina con tipos fuertes (tuple) para que TS no “cuelgue” union types
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
        visible, // ya son T[] asegurados
        all,
        latest,
        year,
        variant,
        keyword: this.keyword(),
      })
    ),
    shareReplay({ bufferSize: 1, refCount: true })
  );

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

  readonly eventsByMonthForChart$ = this.eventsForCharts$.pipe(
    map((list) => this.analytics.countByMonth(list)),
    shareReplay({ bufferSize: 1, refCount: true })
  );

  readonly eventsByPlaceForChart$ = this.eventsForCharts$.pipe(
    map((list) => this.analytics.countByPlace(list)),
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
}
