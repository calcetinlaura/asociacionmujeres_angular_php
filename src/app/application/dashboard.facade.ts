import { inject, Injectable, signal } from '@angular/core';
import { toObservable } from '@angular/core/rxjs-interop';
import {
  animationFrameScheduler,
  catchError,
  combineLatest,
  concat,
  distinctUntilChanged,
  forkJoin,
  map,
  Observable,
  observeOn,
  of,
  share,
  startWith,
  switchMap,
} from 'rxjs';

import { TranslationsService } from 'src/i18n/translations.service';
import {
  AudienceDTO,
  EventModelFullData,
} from '../core/interfaces/event.interface';
import { InvoiceModelFullData } from '../core/interfaces/invoice.interface';
import { PartnerModel } from '../core/interfaces/partner.interface';
import { ProjectModelFullData } from '../core/interfaces/project.interface';
import { SubsidyModelFullData } from '../core/interfaces/subsidy.interface';
import {
  AnalyticsService,
  AnnualPoint,
  PieDatum,
} from '../core/services/analytics.service';
import { BooksService } from '../core/services/books.services';
import { EventsService } from '../core/services/events.services';
import { InvoicesService } from '../core/services/invoices.services';
import { MoviesService } from '../core/services/movies.services';
import { PartnersService } from '../core/services/partners.services';
import { PiterasService } from '../core/services/piteras.services';
import { ProjectsService } from '../core/services/projects.services';
import { RecipesService } from '../core/services/recipes.services';
import { SubsidiesService } from '../core/services/subsidies.services';
import { MonthBar } from '../modules/dashboard/pages/home/charts/monthly-chart/monthly-chart.component';
import { calcAge } from '../shared/utils/age.util';
import {
  audienceAgeLabel,
  AudienceDict,
  parseAudience,
} from '../shared/utils/audience.util';
import { LoadState, withLoading } from '../shared/utils/loading.operator';
import { EventsFacade } from './events.facade';

/** === NUEVOS TIPOS (alineados con la nueva fachada/servicio) === */
type YearFilter = number | 'historic';
export type PeriodicView = 'all' | 'groupedByPeriodicId';
export type PublishScope = 'published' | 'drafts' | 'scheduled' | 'all';

export interface HBarDatum {
  label: string;
  value: number;
}

type State<T> = { loading: boolean; error: string | null; data: T };

type AgeBucketKey =
  | 'under18'
  | 'from18to30'
  | 'from30to45'
  | 'from45to60'
  | 'from60to75'
  | 'from75to80'
  | 'over80';

type AgeBucket = { key: AgeBucketKey; min: number | null; max: number | null };

// 👇 KPIs solicitados
export interface PartnersKpis {
  totalSocias: number;
  sociasAnio: number;
  edadMediaAnio?: number;
  metodoMasUsadoAnio?: string;
  mesTopPagosAnio?: number; // 1..12
}

// Para manejar cuotas en partners (legacy y actual)
type CuotaLite = {
  year: number;
  paid: boolean;
  date_payment?: string | null;
  method_payment?: 'cash' | 'domiciliation' | null;
};

const AGE_BUCKETS = [
  { key: 'under18', min: null, max: 18 },
  { key: 'from18to30', min: 18, max: 30 },
  { key: 'from30to45', min: 30, max: 45 },
  { key: 'from45to60', min: 45, max: 60 },
  { key: 'from60to75', min: 60, max: 75 },
  { key: 'from75to80', min: 75, max: 80 },
  { key: 'over80', min: 80, max: null },
] satisfies ReadonlyArray<AgeBucket>;

@Injectable({ providedIn: 'root' })
export class DashboardFacade {
  // ── Inyecciones ───────────────────────────────────────────────────────────────
  private readonly eventsFacade = inject(EventsFacade);
  private readonly eventsService = inject(EventsService);
  private readonly booksService = inject(BooksService);
  private readonly moviesService = inject(MoviesService);
  private readonly recipesService = inject(RecipesService);
  private readonly partnersService = inject(PartnersService);
  private readonly piterasService = inject(PiterasService);
  private readonly invoicesService = inject(InvoicesService);
  private readonly subsidiesService = inject(SubsidiesService);
  private readonly projectsService = inject(ProjectsService);
  private readonly analytics = inject(AnalyticsService);
  private readonly i18n = inject(TranslationsService);

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

  /** En la nueva API, “view” controla si quieres todos los pases o agrupado por periodic_id */
  readonly view = signal<PeriodicView>('groupedByPeriodicId');

  /** Scope de publicación (para analítica/general en dashboard, por defecto todos) */
  readonly scope = signal<PublishScope>('all');

  /** buscador local (aplicado sobre visibleEvents$ de la fachada) */
  readonly keyword = signal<string>('');

  // Observables derivados de signals
  private readonly viewYear$ = toObservable(this.viewYear).pipe(
    distinctUntilChanged()
  );
  private readonly view$ = toObservable(this.view).pipe(distinctUntilChanged());
  private readonly scope$ = toObservable(this.scope).pipe(
    distinctUntilChanged()
  );

  // Trigger que provoca "loading" en los gráficos dependientes de año/view/scope
  private readonly viewTrigger$ = combineLatest([
    this.viewYear$,
    this.view$,
    this.scope$,
  ]);

  constructor() {
    // Para dashboard queremos tener disponibles ambas colecciones (no agrupados y agrupados)
    // para que el VM y los gráficos puedan usar una u otra sin relanzar cargas.
    const y = this.year();
    this.eventsFacade.loadDashboardAllNotGrouped(y); // view='all', scope='all'
    this.eventsFacade.loadDashboardAllGrouped(y); // view='groupedByPeriodicId', scope='all'
  }

  // ── Helpers generales ─────────────────────────────────────────────────────────
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
        concat(
          of({ loading: true, data: null as unknown as T } as LoadState<T>),
          data$.pipe(
            observeOn(animationFrameScheduler),
            map((data) => ({ loading: false, data } as LoadState<T>)),
            catchError((error) =>
              of({ loading: false, error, data: null as unknown as T })
            )
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
    this.eventsFacade.allEvents$
  );
  private readonly grouped$ = this.toArray$<EventModelFullData>(
    this.eventsFacade.groupedEvents$
  );

  // ── ViewModel principal ───────────────────────────────────────────────────────
  readonly vm$ = combineLatest<
    [
      EventModelFullData[],
      EventModelFullData[],
      EventModelFullData[],
      number,
      PeriodicView
    ]
  >([
    this.visible$,
    this.all$,
    this.grouped$,
    toObservable(this.year),
    toObservable(this.view),
  ]).pipe(
    map(([visible, all, grouped, year, view]) =>
      this.analytics.buildDashboardVM({
        visible,
        all,
        latest: grouped, // “latest” en tu analítica eran los no repetidos → ahora agrupados
        year,
        variant: view === 'groupedByPeriodicId' ? 'latest' : 'all',
        keyword: this.keyword(),
      })
    ),
    share({ resetOnRefCountZero: true })
  );

  // ── Eventos para gráficos (respeta viewYear, view y scope) ────────────────────
  readonly eventsForCharts$ = combineLatest([
    this.viewYear$,
    this.view$,
    this.scope$,
  ]).pipe(
    switchMap(([vy, view, scope]) => {
      if (vy === 'historic') {
        return forkJoin(
          this.years.map((y) =>
            this.eventsService
              .getEventsByYear(y, view, scope)
              .pipe(catchError(() => of([])))
          )
        ).pipe(map((lists) => lists.flat()));
      }
      return this.eventsService
        .getEventsByYear(vy as number, view, scope)
        .pipe(catchError(() => of([])));
    }),
    share({ resetOnRefCountZero: true })
  );

  // ── Streams derivados para charts ─────────────────────────────────────────────
  readonly eventsByMonthForChart$ = this.eventsForCharts$.pipe(
    map((list) => this.analytics.countByMonth(list)),
    share({ resetOnRefCountZero: true })
  );

  readonly eventsByPlaceForChart$ = this.eventsForCharts$.pipe(
    map((list) => this.analytics.countByPlace(list)),
    share({ resetOnRefCountZero: true })
  );

  readonly annual$ = combineLatest([
    of(this.years),
    this.view$,
    this.scope$,
  ]).pipe(
    switchMap(([ys, view, scope]) =>
      forkJoin(
        ys.map((y) =>
          this.eventsService.getEventsByYear(y, view, scope).pipe(
            map((list) => ({ label: y, count: (list ?? []).length })),
            catchError(() => of({ label: y, count: 0 }))
          )
        )
      )
    ),
    map((arr) => arr.sort((a, b) => a.label - b.label)),
    share({ resetOnRefCountZero: true })
  );

  // ── Pies (donut) ─────────────────────────────────────────────────────────────
  readonly eventsByAccessYear$ = this.eventsForCharts$.pipe(
    map((list) => this.analytics.groupEventsByAccess(list)),
    share({ resetOnRefCountZero: true })
  );

  readonly eventsByCategoryYear$ = this.eventsForCharts$.pipe(
    map((list) => this.analytics.groupEventsByCategory(list)),
    share({ resetOnRefCountZero: true })
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

  // ── Partners (secciones sin cambios funcionales) ─────────────────────────────
  readonly partnersAnnual$ = this.partnersService.getPartners().pipe(
    map((partners: PartnerModel[] | null | undefined) => {
      const start = 1995;
      const end = this.currentYear;
      const years: number[] = Array.from(
        { length: end - start + 1 },
        (_, i) => start + i
      );

      const yearToPartners: Map<number, Set<number>> = new Map();
      for (const y of years) yearToPartners.set(y, new Set<number>());

      const list: PartnerModel[] = Array.isArray(partners) ? partners : [];

      list.forEach((p: PartnerModel, idx: number) => {
        const cuotas: CuotaLite[] = this.normalizeCuotas((p as any).cuotas);
        const paidYears: Set<number> = new Set<number>();

        for (const c of cuotas) {
          if (!c.paid) continue;

          let y: number | null = null;
          if (c.date_payment) {
            const d = new Date(c.date_payment as string);
            if (!isNaN(d.getTime())) y = d.getFullYear();
          }
          if (y == null) y = Number(c.year);

          if (
            Number.isFinite(y) &&
            (y as number) >= start &&
            (y as number) <= end
          ) {
            paidYears.add(y as number);
          }
        }

        paidYears.forEach((y: number) => {
          const set = yearToPartners.get(y);
          if (set) set.add(idx);
        });
      });

      return years.map((y: number) => ({
        label: y,
        count: (yearToPartners.get(y) as Set<number>).size,
      }));
    }),
    share({ resetOnRefCountZero: true })
  );

  // ── Estados con "loading al cambiar" ─────────────────────────────────────────
  readonly eventsByMonthState$: Observable<
    LoadState<Array<{ month: number; count: number }>>
  > = this.withLoadingOnChange(this.viewTrigger$, this.eventsByMonthForChart$);

  readonly eventsByPlaceHBar$ = this.eventsByPlaceForChart$;
  readonly eventsByPlaceHBarState$: Observable<LoadState<HBarDatum[]>> =
    this.withLoadingOnChange(this.viewTrigger$, this.eventsByPlaceHBar$);

  readonly eventsByAccessYearState$: Observable<LoadState<PieDatum[]>> =
    this.withLoadingOnChange(this.viewTrigger$, this.eventsByAccessYear$);

  readonly eventsByCategoryYearState$: Observable<LoadState<PieDatum[]>> =
    this.withLoadingOnChange(this.viewTrigger$, this.eventsByCategoryYear$);

  readonly annualState$: Observable<
    LoadState<{ label: number; count: number }[]>
  > = withLoading(this.annual$);

  readonly booksByGenreYearState$: Observable<LoadState<PieDatum[]>> =
    withLoading(this.booksByGenreYear$);

  readonly moviesByGenreYearState$: Observable<LoadState<PieDatum[]>> =
    withLoading(this.moviesByGenreYear$);

  readonly recipesByCategoryYearState$: Observable<LoadState<PieDatum[]>> =
    withLoading(this.recipesByCategoryYear$);

  readonly partnersAnnualState$: Observable<LoadState<AnnualPoint[]>> =
    withLoading(this.partnersAnnual$);

  // ── Donut “Público” ──────────────────────────────────────────────────────────
  private audienceLabelForEvent(
    e: EventModelFullData,
    dict: AudienceDict
  ): string {
    const A = dict.audience;
    const a: AudienceDTO | null = parseAudience((e as any).audience);

    if (!a || !A) return 'Desconocido';
    if (a.allPublic) return A.allPublic;

    if (a.hasAgeRecommendation) {
      const label = audienceAgeLabel(a.ages ?? {}, dict);
      if (label) return label;
    }

    if (a.hasRestriction) {
      if (a.restrictions?.partnersOnly) return A.restrictions.partnersOnly;
      if (a.restrictions?.womenOnly) return A.restrictions.womenOnly;
      if (a.restrictions?.other && a.restrictions?.otherText) {
        return A.restrictions.other.replace(
          '{{text}}',
          a.restrictions.otherText
        );
      }
    }
    return 'Desconocido';
  }

  readonly audiencePie$ = this.eventsForCharts$.pipe(
    map((events) => {
      const dict = this.i18n.dict() as any as AudienceDict;
      const counts = new Map<string, number>();

      for (const ev of events ?? []) {
        const label = this.audienceLabelForEvent(ev, dict);
        counts.set(label, (counts.get(label) ?? 0) + 1);
      }

      return Array.from(counts.entries())
        .map(([label, value]) => ({ label, value }))
        .sort((a, b) => b.value - a.value);
    }),
    share({ resetOnRefCountZero: true })
  );

  readonly audienceYearState$: Observable<
    LoadState<Array<{ label: string; value: number }>>
  > = this.withLoadingOnChange(this.viewTrigger$, this.audiencePie$);

  // ── Distribución por edad de socias (donut) ───────────────────────────────────
  private readonly AGE_BUCKETS: Array<{
    label: string;
    min: number | null;
    max: number | null;
  }> = [
    { label: 'MENORES DE 18 años', min: null, max: 18 },
    { label: 'ENTRE 18-30 años', min: 18, max: 30 },
    { label: 'Entre 30-45 años', min: 30, max: 45 },
    { label: 'Entre 45 - 60 años', min: 45, max: 60 },
    { label: 'entre 60 - 75 años', min: 60, max: 75 },
    { label: 'Entre 75 y 80 años', min: 75, max: 80 },
    { label: 'mayores de 80 años', min: 80, max: null },
  ];

  private bucketKeyForAge(age: number): AgeBucketKey | null {
    for (const b of AGE_BUCKETS) {
      const okMin = b.min == null || age >= b.min;
      const okMax = b.max == null || age < b.max;
      if (okMin && okMax) return b.key;
    }
    return null;
  }

  private calcAgeAt(dobLike: unknown, asOf: Date): number | null {
    if (!dobLike) return null;
    const dob = new Date(dobLike as any);
    if (isNaN(dob.getTime())) return null;

    let age = asOf.getFullYear() - dob.getFullYear();
    const m = asOf.getMonth() - dob.getMonth();
    if (m < 0 || (m === 0 && asOf.getDate() < dob.getDate())) age--;
    return age >= 0 ? age : null;
  }

  private hasPaidInYearLite(cuotasLike: unknown, year: number): boolean {
    const cs = this.normalizeCuotas(cuotasLike as any);
    for (const c of cs) {
      if (!c.paid) continue;
      if (c.date_payment) {
        const d = new Date(c.date_payment as string);
        if (!isNaN(d.getTime()) && d.getFullYear() === year) return true;
      } else if (Number(c.year) === year) {
        return true;
      }
    }
    return false;
  }

  readonly partnersAgeBuckets$ = combineLatest([
    this.partnersService.getPartners(),
    this.viewYear$, // dependemos del año de vista
  ]).pipe(
    map(([partners, vy]) => {
      const list: PartnerModel[] = Array.isArray(partners) ? partners : [];

      let filtered: PartnerModel[];
      let asOf: Date;
      if (vy === 'historic') {
        filtered = list;
        asOf = new Date();
      } else {
        const year = Number(vy);
        filtered = list.filter((p) =>
          this.hasPaidInYearLite((p as any).cuotas, year)
        );
        asOf = new Date(year, 11, 31);
      }

      const counts = new Map<AgeBucketKey, number>();
      let unknown = 0;

      for (const p of filtered) {
        const dob =
          (p as any).birthdate ??
          (p as any).birthday ??
          (p as any).dob ??
          (p as any).fecha_nacimiento ??
          (p as any).date_of_birth;

        const age = this.calcAgeAt(dob, asOf);
        if (age == null) {
          unknown++;
          continue;
        }

        const key = this.bucketKeyForAge(age);
        if (!key) {
          unknown++;
          continue;
        }
        counts.set(key, (counts.get(key) ?? 0) + 1);
      }

      const data: PieDatum[] = AGE_BUCKETS.map((b) => ({
        label: b.key,
        value: counts.get(b.key) ?? 0,
      }));

      if (unknown > 0) data.push({ label: 'unknown' as any, value: unknown });

      return data.sort((a, b) => b.value - a.value);
    })
  );

  readonly partnersAgeBucketsState$: Observable<LoadState<PieDatum[]>> =
    withLoading(this.partnersAgeBuckets$);

  // ── Utils de cuotas para KPIs ────────────────────────────────────────────────
  private normalizeCuotas(a: unknown): CuotaLite[] {
    if (!Array.isArray(a)) return [];
    const first = a[0];
    if (typeof first === 'number') {
      return (a as number[]).map((y) => ({
        year: y,
        paid: true,
        date_payment: null,
        method_payment: null,
      }));
    }
    return (a as any[]).map((c) => ({
      year: Number(c?.year),
      paid: !!c?.paid,
      date_payment: c?.date_payment ?? null,
      method_payment: (c?.method_payment ?? null) as
        | 'cash'
        | 'domiciliation'
        | null,
    }));
  }

  private paidCuotasFromPartners(partners: any[]): CuotaLite[] {
    const out: CuotaLite[] = [];
    for (const p of partners ?? []) {
      const cs = this.normalizeCuotas(p?.cuotas);
      for (const c of cs) if (c.paid) out.push(c);
    }
    return out;
  }

  private labelMetodo(k: 'cash' | 'domiciliation' | 'unknown'): string {
    const pm = ((this.i18n.dict() as any) ?? {}).paymentMethod ?? {};
    if (k === 'cash') return pm.cash ?? 'Efectivo';
    if (k === 'domiciliation') return pm.domiciliation ?? 'Domiciliación';
    return pm.unspecified ?? 'Sin especificar';
  }

  readonly paymentsByMethod$ = combineLatest([
    this.partnersService.getPartners(),
    this.viewYear$,
  ]).pipe(
    map(([partners, vy]) => {
      const year = vy === 'historic' ? this.currentYear : (vy as number);
      let cash = 0,
        dom = 0,
        unk = 0;

      for (const p of partners ?? []) {
        const cuotas = this.normalizeCuotas((p as any).cuotas);
        for (const c of cuotas) {
          if (!c.paid) continue;
          const okYear = c.date_payment
            ? (() => {
                const d = new Date(c.date_payment!);
                return !isNaN(d.getTime()) && d.getFullYear() === year;
              })()
            : c.year === year;
          if (!okYear) continue;

          const k = (c.method_payment ?? 'unknown') as
            | 'cash'
            | 'domiciliation'
            | 'unknown';
          if (k === 'cash') cash++;
          else if (k === 'domiciliation') dom++;
          else unk++;
        }
      }

      const out: PieDatum[] = [];
      if (cash) out.push({ label: this.labelMetodo('cash'), value: cash });
      if (dom)
        out.push({ label: this.labelMetodo('domiciliation'), value: dom });
      if (unk) out.push({ label: this.labelMetodo('unknown'), value: unk });
      return out;
    }),
    share({ resetOnRefCountZero: true })
  );

  readonly paymentsByMethodState$ = withLoading<PieDatum[]>(
    this.paymentsByMethod$
  );

  readonly paymentsByMonth$ = combineLatest([
    this.partnersService.getPartners(),
    this.viewYear$,
  ]).pipe(
    map(([partners, vy]) => {
      const year = vy === 'historic' ? this.currentYear : (vy as number);
      const buckets: MonthBar[] = Array.from({ length: 12 }, (_, i) => ({
        month: i + 1,
        count: 0,
      }));

      for (const p of partners ?? []) {
        const cuotas = this.normalizeCuotas((p as any).cuotas);
        for (const c of cuotas) {
          if (!c.paid) continue;
          if (!c.date_payment) continue;
          const d = new Date(c.date_payment);
          if (isNaN(d.getTime()) || d.getFullYear() !== year) continue;
          buckets[d.getMonth()].count++;
        }
      }
      return buckets;
    }),
    share({ resetOnRefCountZero: true })
  );

  readonly paymentsByMonthState$ = withLoading<MonthBar[]>(
    this.paymentsByMonth$
  );

  readonly partnersKpis$ = combineLatest([
    this.partnersService.getPartners(),
    this.viewYear$,
  ]).pipe(
    map(([partners, vy]) => {
      const targetYear = vy === 'historic' ? this.currentYear : (vy as number);

      const totalSocias = (partners ?? []).length;

      const hasPaidInYear = (p: any) => {
        const cs = this.normalizeCuotas(p?.cuotas);
        return cs.some((c) => {
          if (!c.paid) return false;
          if (c.date_payment) {
            const d = new Date(c.date_payment);
            return !isNaN(d.getTime()) && d.getFullYear() === targetYear;
          }
          return c.year === targetYear;
        });
      };

      const partnersYear = (partners ?? []).filter(hasPaidInYear);
      const sociasAnio = partnersYear.length;

      const edades: number[] = partnersYear
        .map((p: PartnerModel) => calcAge(p.birthday))
        .filter((x: any) => typeof x === 'number') as number[];
      const edadMediaAnio = edades.length
        ? Math.round((edades.reduce((a, b) => a + b, 0) / edades.length) * 10) /
          10
        : undefined;

      let cash = 0,
        dom = 0,
        unk = 0;
      const monthCounts = Array.from({ length: 12 }, () => 0);

      for (const p of partnersYear) {
        for (const c of this.normalizeCuotas(p?.cuotas)) {
          if (!c.paid) continue;

          let okYear = false;
          if (c.date_payment) {
            const d = new Date(c.date_payment);
            okYear = !isNaN(d.getTime()) && d.getFullYear() === targetYear;
            if (okYear) monthCounts[d.getMonth()]++;
          } else {
            okYear = c.year === targetYear;
          }
          if (!okYear) continue;

          const k = (c.method_payment ?? 'unknown') as
            | 'cash'
            | 'domiciliation'
            | 'unknown';
          if (k === 'cash') cash++;
          else if (k === 'domiciliation') dom++;
          else unk++;
        }
      }

      let metodoMasUsadoAnio: string | undefined;
      if (cash || dom || unk) {
        const maxK =
          cash >= dom
            ? cash >= unk
              ? 'cash'
              : 'unknown'
            : dom >= unk
            ? 'domiciliation'
            : 'unknown';
        metodoMasUsadoAnio = this.labelMetodo(maxK as any);
      }

      const maxVal = Math.max(...monthCounts);
      const maxMonthIdx = monthCounts.findIndex((v) => v === maxVal);
      const mesTopPagosAnio = monthCounts.every((v) => v === 0)
        ? undefined
        : maxMonthIdx + 1;

      return {
        totalSocias,
        sociasAnio,
        edadMediaAnio,
        metodoMasUsadoAnio,
        mesTopPagosAnio,
      } as PartnersKpis;
    }),
    share({ resetOnRefCountZero: true })
  );

  readonly partnersKpisState$: Observable<LoadState<PartnersKpis>> =
    withLoading(this.partnersKpis$);

  // ── Píteras (igual que antes) ────────────────────────────────────────────────
  readonly piterasSorted$ = this.piterasService
    .getPiteras()
    .pipe(
      map((rows) =>
        (rows ?? [])
          .filter((r: any) => r && r.pages && r.publication_number)
          .sort(
            (a: any, b: any) =>
              Number(a.year) - Number(b.year) ||
              Number(a.publication_number) - Number(b.publication_number)
          )
      )
    );

  readonly pagesPerIssue$ = this.piterasSorted$.pipe(
    map((rows: any[]) =>
      rows.map(
        (r: any) =>
          ({
            label: Number(r.publication_number),
            count: Number(r.pages),
          } as AnnualPoint)
      )
    )
  );

  readonly pagesPerIssueState$ = this.pagesPerIssue$.pipe(
    map(
      (data) => ({ loading: false, error: null, data } as State<AnnualPoint[]>)
    ),
    startWith({ loading: true, error: null, data: [] } as State<AnnualPoint[]>),
    catchError((e) =>
      of({ loading: false, error: String(e), data: [] } as State<AnnualPoint[]>)
    )
  );

  // ── Métodos públicos (UI) ─────────────────────────────────────────────────────
  /** Cambia el año de gráficos/tablas. Si no es “historic”, recarga bundles dashboard (agrupado y no agrupado). */
  changeYear(v: number | 'historic') {
    this.viewYear.set(v === 'historic' ? 'historic' : Number(v));
    if (v !== 'historic') {
      const yy = Number(v);
      this.year.set(yy);
      // Cargamos ambas vistas (all + grouped) con scope actual
      const sc = this.scope();
      if (sc === 'all') {
        this.eventsFacade.loadDashboardAllNotGrouped(yy);
        this.eventsFacade.loadDashboardAllGrouped(yy);
      } else {
        // Si decidieras usar scope ≠ all para los gráficos
        this.eventsFacade.loadDashboardByScope(yy, sc, 'all');
        this.eventsFacade.loadDashboardByScope(yy, sc, 'groupedByPeriodicId');
      }
    }
  }

  /** Cambia la vista (no agrupado vs agrupado). */
  changeView(v: PeriodicView) {
    this.view.set(v);
    // Opcional: ajustar visible list si quieres que la tabla principal siga la vista
    const yy = this.year();
    const sc = this.scope();
    if (sc === 'all') {
      if (v === 'all') this.eventsFacade.loadDashboardAllNotGrouped(yy);
      else this.eventsFacade.loadDashboardAllGrouped(yy);
    } else {
      this.eventsFacade.loadDashboardByScope(yy, sc, v);
    }
  }

  /** Cambia el scope de publicación (por defecto usamos 'all' en dashboard). */
  changeScope(v: PublishScope) {
    this.scope.set(v);
    const yy = this.year();
    // refresca ambas vistas para mantener VM sincronizado
    this.eventsFacade.loadDashboardByScope(yy, v, 'all');
    this.eventsFacade.loadDashboardByScope(yy, v, 'groupedByPeriodicId');
  }

  /** Busca en la lista visible de la fachada (filtrado cliente). */
  search(word: string) {
    this.keyword.set(word.trim());
    this.eventsFacade.applyFilterWord(this.keyword());
  }

  clearSearch() {
    this.search('');
  } // 1️⃣ Ingresos: facturas + subvenciones adjudicadas
  readonly incomeByType$ = combineLatest([
    this.viewYear$,
    this.invoicesService.getInvoices(),
    this.subsidiesService.getSubsidies(),
  ]).pipe(
    map(([vy, invoices, subs]) => {
      const year = vy === 'historic' ? this.currentYear : (vy as number);

      // Ingresos: facturas de tipo "INCOME"
      const totalInvoices = (invoices ?? [])
        .filter(
          (i: any) =>
            new Date(i.date_invoice).getFullYear() === year &&
            i.type_invoice === 'INCOME'
        )
        .reduce(
          (sum: number, i: any) =>
            sum + Number(i.total_amount_irpf ?? i.total_amount ?? 0),
          0
        );

      // Subvenciones concedidas ese año
      const totalSubv = (subs ?? [])
        .filter((s: any) => s.year === year)
        .reduce(
          (sum: number, s: any) => sum + Number(s.amount_granted ?? 0),
          0
        );

      return [
        { label: 'Ingresos internos', value: totalInvoices },
        { label: 'Subvenciones adjudicadas', value: totalSubv },
      ] satisfies PieDatum[];
    }),
    catchError(() => of([]))
  );

  readonly incomeByTypeState$ = withLoading(this.incomeByType$);
  readonly subsidiesByType$ = combineLatest([
    this.viewYear$,
    this.subsidiesService.getSubsidies(),
  ]).pipe(
    map(([vy, subsidies]) => {
      const year = vy === 'historic' ? this.currentYear : (vy as number);

      const subsOfYear = (subsidies ?? []).filter((s: any) => s.year === year);

      // Agrupa por tipo de subvención (campo "name")
      const grouped = new Map<string, number>();
      for (const s of subsOfYear) {
        const key = s.name || 'OTROS';
        grouped.set(
          key,
          (grouped.get(key) || 0) + Number(s.amount_granted || 0)
        );
      }

      // Mapea con los nombres legibles
      return [...grouped.entries()].map(([code, value]) => ({
        label: this.subsidiesService.subsidiesMap[code] ?? code,
        value,
      })) satisfies PieDatum[];
    }),
    catchError(() => of([]))
  );

  readonly subsidiesByTypeState$ = withLoading(this.subsidiesByType$);
  readonly incomeByConcept$ = combineLatest([
    this.viewYear$,
    this.invoicesService.getInvoices(),
  ]).pipe(
    map(([vy, invoices]) => {
      const year = vy === 'historic' ? this.currentYear : (vy as number);

      const incomeInvoices = (invoices ?? []).filter(
        (i: any) =>
          i.type_invoice === 'INCOME' &&
          new Date(i.date_invoice).getFullYear() === year
      );

      const grouped = new Map<string, number>();
      for (const inv of incomeInvoices) {
        const key = inv.description?.trim() || 'Sin concepto';
        grouped.set(
          key,
          (grouped.get(key) || 0) +
            Number(inv.total_amount_irpf ?? inv.total_amount ?? 0)
        );
      }

      return [...grouped.entries()]
        .map(([label, value]) => ({ label, value }))
        .sort((a, b) => b.value - a.value) satisfies PieDatum[];
    }),
    catchError(() => of([]))
  );

  readonly incomeByConceptState$ = withLoading(this.incomeByConcept$);

  // 2️⃣ Gastos: facturas + tickets
  // 2️⃣ Gastos: facturas + tickets
  readonly expensesByType$ = combineLatest([
    this.viewYear$,
    this.invoicesService.getInvoices(),
  ]).pipe(
    map(([vy, invoices]) => {
      const year = vy === 'historic' ? this.currentYear : (vy as number);

      const list = Array.isArray(invoices) ? invoices : [];

      const facturas = list
        .filter(
          (i) =>
            i.type_invoice === 'INVOICE' &&
            new Date(i.date_invoice).getFullYear() === year
        )
        .reduce((sum, i) => sum + Number(i.total_amount_irpf || 0), 0);

      const tickets = list
        .filter(
          (i) =>
            i.type_invoice === 'TICKET' &&
            new Date(i.date_invoice).getFullYear() === year
        )
        .reduce((sum, i) => sum + Number(i.total_amount_irpf || 0), 0);

      return [
        { label: 'Facturas', value: facturas },
        { label: 'Tickets', value: tickets },
      ] satisfies PieDatum[];
    }),
    catchError(() => of([]))
  );
  readonly expensesByTypeState$ = withLoading(this.expensesByType$);

  // 3️⃣ Comparativo total: subvenciones, tickets, ingresos
  readonly economyByYear$ = combineLatest([
    this.invoicesService.getInvoices(),
    this.subsidiesService.getSubsidies(),
  ]).pipe(
    map(
      ([invoices, subsidies]: [
        InvoiceModelFullData[],
        SubsidyModelFullData[]
      ]) => {
        if (!Array.isArray(invoices) || !Array.isArray(subsidies)) return [];

        const current = new Date().getFullYear();
        const years = Array.from({ length: 5 }, (_, i) => current - i);

        return years.map((year) => {
          // 🟢 Ingresos (INCOME)
          const ingresos = (invoices ?? [])
            .filter(
              (inv) =>
                inv?.type_invoice === 'INCOME' &&
                new Date(inv.date_invoice).getFullYear() === year
            )
            .reduce((sum, inv) => {
              const v = Number(
                inv?.total_amount_irpf ?? inv?.total_amount ?? 0
              );
              return sum + (isFinite(v) ? v : 0);
            }, 0);

          // 🔵 Gastos: separamos facturas y tickets
          const gastosFacturas = (invoices ?? [])
            .filter(
              (inv) =>
                inv?.type_invoice === 'INVOICE' &&
                new Date(inv.date_invoice).getFullYear() === year
            )
            .reduce((sum, inv) => {
              const v = Number(
                inv?.total_amount_irpf ?? inv?.total_amount ?? 0
              );
              return sum + (isFinite(v) ? v : 0);
            }, 0);

          const gastosTickets = (invoices ?? [])
            .filter(
              (inv) =>
                inv?.type_invoice === 'TICKET' &&
                new Date(inv.date_invoice).getFullYear() === year
            )
            .reduce((sum, inv) => {
              const v = Number(
                inv?.total_amount_irpf ?? inv?.total_amount ?? 0
              );
              return sum + (isFinite(v) ? v : 0);
            }, 0);

          // 🟠 Subvenciones concedidas
          const subvenciones = (subsidies ?? [])
            .filter((s) => Number(s?.year) === year)
            .reduce((sum, s) => {
              const v = Number(s?.amount_granted ?? 0);
              return sum + (isFinite(v) ? v : 0);
            }, 0);

          return {
            year,
            ingresos,
            gastosFacturas,
            gastosTickets,
            subvenciones,
          };
        });
      }
    )
  );
  readonly economyByYearState$ = withLoading(this.economyByYear$);

  // 3️⃣ Gastos por proyecto
  readonly expensesByProject$ = combineLatest([
    this.viewYear$,
    this.projectsService.getProjects(),
  ]).pipe(
    map(([vy, projects]: [YearFilter, ProjectModelFullData[] | null]) => {
      const year: number =
        vy === 'historic' ? this.currentYear : (vy as number);

      const list: ProjectModelFullData[] = Array.isArray(projects)
        ? projects
        : [];

      const rows: PieDatum[] = list
        .map((p: ProjectModelFullData): PieDatum => {
          const invs: InvoiceModelFullData[] = Array.isArray(p.invoices)
            ? p.invoices
            : [];

          const total: number = invs
            .filter(
              (inv: InvoiceModelFullData) =>
                (inv.type_invoice === 'INVOICE' ||
                  inv.type_invoice === 'TICKET') &&
                new Date(inv.date_invoice).getFullYear() === year
            )
            .reduce(
              (sum: number, inv: InvoiceModelFullData) =>
                sum + Number(inv.total_amount ?? 0),
              0
            );

          return { label: p.title, value: total };
        })
        .filter((row: PieDatum) => row.value > 0)
        .sort((a: PieDatum, b: PieDatum) => b.value - a.value);

      return rows;
    }),
    catchError(() => of([] as PieDatum[]))
  );

  readonly expensesByProjectState$ = withLoading(this.expensesByProject$);
  // Donut comparativo económico (solo año seleccionado)
  readonly economyDonutByYear$ = combineLatest([
    this.viewYear$,
    this.economyByYear$,
  ]).pipe(
    map(([vy, data]) => {
      const year = vy === 'historic' ? this.currentYear : (vy as number);
      const list = Array.isArray(data) ? data : [];

      const found = list.find((d) => d.year === year);
      if (!found) return [];

      return [
        { label: 'Ingresos', value: found.ingresos },
        { label: 'Gastos', value: found.gastosFacturas + found.gastosTickets },
        { label: 'Subvenciones', value: found.subvenciones },
      ];
    }),
    catchError(() => of([]))
  );

  // 👇 ESTA línea es la importante
  readonly economyDonutByYearState$ = withLoading(this.economyDonutByYear$);
}
