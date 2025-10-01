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
import { PartnerModel } from '../core/interfaces/partner.interface';
import {
  AnalyticsService,
  AnnualPoint,
  PieDatum,
} from '../core/services/analytics.service';
import { BooksService } from '../core/services/books.services';
import { EventsService } from '../core/services/events.services';
import { MoviesService } from '../core/services/movies.services';
import { PartnersService } from '../core/services/partners.services';
import { PiterasService } from '../core/services/piteras.services';
import { RecipesService } from '../core/services/recipes.services';
import { MonthBar } from '../modules/dashboard/pages/home/charts/monthly-chart/monthly-chart.component';
import { calcAge } from '../shared/utils/age.util';
import {
  audienceAgeLabel,
  AudienceDict,
  parseAudience,
} from '../shared/utils/audience.util';
import { LoadState, withLoading } from '../shared/utils/loading.operator';
import { EventsFacade } from './events.facade';

type YearFilter = number | 'historic';
export type PeriodicVariant = 'latest' | 'all';

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
  monthName(n?: number): string {
    if (!n || n < 1 || n > 12) return '—';
    const nombres = [
      'enero',
      'febrero',
      'marzo',
      'abril',
      'mayo',
      'junio',
      'julio',
      'agosto',
      'septiembre',
      'octubre',
      'noviembre',
      'diciembre',
    ];
    return nombres[n - 1];
  }
  constructor() {
    this.eventsFacade.loadYearBundle(this.year());
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
      // Cada cambio cancela la subscripción anterior
      switchMap(() =>
        concat(
          // 1) Emite "loading" y permite a la vista renderizarlo
          of({ loading: true, data: null as unknown as T } as LoadState<T>),
          // 2) En el SIGUIENTE frame, escucha los datos (evita el "salto" sin spinner)
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
    share({ resetOnRefCountZero: true })
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

  readonly annual$ = combineLatest([of(this.years), this.variant$]).pipe(
    switchMap(([ys, variant]) =>
      forkJoin(
        ys.map((y) =>
          this.eventsService.getEventsByYear(y, variant).pipe(
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

  readonly partnersAnnual$ = this.partnersService.getPartners().pipe(
    map((partners: PartnerModel[] | null | undefined) => {
      const start = 1995;
      const end = this.currentYear;
      const years: number[] = Array.from(
        { length: end - start + 1 },
        (_, i) => start + i
      );

      // año -> set de índices de socias con al menos un pago ese año
      const yearToPartners: Map<number, Set<number>> = new Map<
        number,
        Set<number>
      >();
      for (const y of years) yearToPartners.set(y, new Set<number>());

      const list: PartnerModel[] = Array.isArray(partners) ? partners : [];

      list.forEach((p: PartnerModel, idx: number) => {
        const cuotas: CuotaLite[] = this.normalizeCuotas((p as any).cuotas);
        const paidYears: Set<number> = new Set<number>();

        for (const c of cuotas) {
          if (!c.paid) continue;

          // Usa el año de la fecha si es válida; si no, cae a c.year
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

  // ── Estados con "loading al cambiar" (spinner entre cambios) ─────────────────
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

  // Estos no dependen de viewYear/variant
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

  /** ¿Esta socia tiene alguna cuota pagada en 'year'? */
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
    this.viewYear$, // <- dependemos del año de vista
  ]).pipe(
    map(([partners, vy]) => {
      const list: PartnerModel[] = Array.isArray(partners) ? partners : [];

      // 1) Filtramos por año (si no es histórico)
      let filtered: PartnerModel[];
      let asOf: Date;
      if (vy === 'historic') {
        // Histórico: todas las socias; edad a fecha de hoy
        filtered = list;
        asOf = new Date(); // hoy
      } else {
        const year = Number(vy);
        filtered = list.filter((p) =>
          this.hasPaidInYearLite((p as any).cuotas, year)
        );
        // Edad a 31/12/{year}
        asOf = new Date(year, 11, 31);
      }

      // 2) Contabilizamos por buckets usando edad EN ESA FECHA
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

      // Ordena descendente por valor
      return data.sort((a, b) => b.value - a.value);
    })
  );

  // El state ya lo tienes:
  readonly partnersAgeBucketsState$: Observable<LoadState<PieDatum[]>> =
    withLoading(this.partnersAgeBuckets$);

  // ── Utils de cuotas para KPIs ────────────────────────────────────────────────
  private normalizeCuotas(a: unknown): CuotaLite[] {
    if (!Array.isArray(a)) return [];
    const first = a[0];
    // legacy: number[]
    if (typeof first === 'number') {
      return (a as number[]).map((y) => ({
        year: y,
        paid: true,
        date_payment: null,
        method_payment: null,
      }));
    }
    // nuevo: CuotaModel[]
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

  // Aplana todas las cuotas pagadas
  private paidCuotasFromPartners(partners: any[]): CuotaLite[] {
    const out: CuotaLite[] = [];
    for (const p of partners ?? []) {
      const cs = this.normalizeCuotas(p?.cuotas);
      for (const c of cs) if (c.paid) out.push(c);
    }
    return out;
  }

  // Traducción simple de método (opcional; puedes cambiarlo por dict/i18n)
  private labelMetodo(k: 'cash' | 'domiciliation' | 'unknown'): string {
    const pm = ((this.i18n.dict() as any) ?? {}).paymentMethod ?? {};
    if (k === 'cash') return pm.cash ?? 'Efectivo';
    if (k === 'domiciliation') return pm.domiciliation ?? 'Domiciliación';
    return pm.unspecified ?? 'Sin especificar';
  }
  // --- Serie: Métodos de pago (para cheese chart) ---
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

  // ¡TIPA el withLoading!
  readonly paymentsByMethodState$ = withLoading<PieDatum[]>(
    this.paymentsByMethod$
  );
  // --- Serie: Pagos por mes (como “Eventos por mes”) ---
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

          // Solo contamos al mes si hay fecha válida del año seleccionado
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

  // ¡TIPA el withLoading!
  readonly paymentsByMonthState$ = withLoading<MonthBar[]>(
    this.paymentsByMonth$
  );

  // ── KPIs de Socias (solo los solicitados) ────────────────────────────────────
  readonly partnersKpis$ = combineLatest([
    this.partnersService.getPartners(),
    this.viewYear$,
  ]).pipe(
    map(([partners, vy]) => {
      const targetYear = vy === 'historic' ? this.currentYear : (vy as number);

      // total histórico
      const totalSocias = (partners ?? []).length;

      // socias con al menos una cuota pagada en el año (por fecha o year)
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

      // edad media de esas socias
      const edades: number[] = partnersYear
        .map((p: PartnerModel) => calcAge(p.birthday))
        .filter((x: any) => typeof x === 'number') as number[];
      const edadMediaAnio = edades.length
        ? Math.round((edades.reduce((a, b) => a + b, 0) / edades.length) * 10) /
          10
        : undefined;

      // método más usado del año + mes con más pagos
      let cash = 0,
        dom = 0,
        unk = 0;
      const monthCounts = Array.from({ length: 12 }, () => 0);

      for (const p of partnersYear) {
        for (const c of this.normalizeCuotas(p?.cuotas)) {
          if (!c.paid) continue;

          // filtra al año
          let okYear = false;
          if (c.date_payment) {
            const d = new Date(c.date_payment);
            okYear = !isNaN(d.getTime()) && d.getFullYear() === targetYear;
            if (okYear) monthCounts[d.getMonth()]++;
          } else {
            okYear = c.year === targetYear; // sin fecha: no sumamos mes
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
        : maxMonthIdx + 1; // 1..12

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

  // ── Píteras: serie auxiliar que ya tenías ────────────────────────────────────
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
