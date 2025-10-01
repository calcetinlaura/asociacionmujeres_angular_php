import { Injectable } from '@angular/core';
import { catchError, forkJoin, map, of, switchMap } from 'rxjs';

export type PieDatum = { label: string; value: number };
export type YearFilter = number | 'historic';
export type PeriodicVariant = 'latest' | 'all';
export interface AnnualPoint {
  label: number;
  count: number;
}
// Si tienes una interfaz real para tu evento, usa esa.
// Aquí dejamos lo mínimo para no acoplarlo.
export interface EventLike {
  [key: string]: any;
  start?: string | number | Date;
  title?: string;
}

export interface DashboardVM {
  year: number;
  variant: PeriodicVariant;
  visible: EventLike[];
  all: EventLike[];
  latest: EventLike[];
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
}

@Injectable({ providedIn: 'root' })
export class AnalyticsService {
  // ======== Fecha / utilidades básicas ========
  toDate(v: unknown): Date | null {
    if (!v) return null;
    const d = new Date(v as string | number | Date);
    return isNaN(d.getTime()) ? null : d;
  }

  monthIdx(d: Date) {
    return d.getMonth();
  }

  weekOfYear(d: Date) {
    // ISO week number
    const tmp = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
    const dayNum = tmp.getUTCDay() || 7;
    tmp.setUTCDate(tmp.getUTCDate() + 4 - dayNum);
    const yearStart = new Date(Date.UTC(tmp.getUTCFullYear(), 0, 1));
    const diffDays =
      Math.floor((tmp.getTime() - yearStart.getTime()) / 86400000) + 1;
    return Math.ceil(diffDays / 7);
  }

  getPlaceName(e: any): string {
    // Normaliza posibles campos de “lugar”
    return (
      e?.place?.name ||
      e?.place_name ||
      e?.place_title ||
      e?.place ||
      (e?.place_id != null ? `Espacio #${e.place_id}` : 'Sin espacio')
    );
  }

  // ======== Agrupadores para quesitos ========
  groupBooksByGender = (books: any[]) =>
    this.groupByKey(books, ['gender'], 'Sin género');

  groupMoviesByGender = (movies: any[]) =>
    this.groupByKey(movies, ['gender', 'genre'], 'Sin género');

  groupRecipesByCategory = (recipes: any[]) =>
    this.groupByKey(
      recipes,
      ['category', 'categoria', 'type'],
      'Sin categoría'
    );

  private groupByKey(
    items: any[],
    keys: string[],
    fallback: string
  ): PieDatum[] {
    const m = new Map<string, number>();
    for (const it of items ?? []) {
      const k = keys.find((kk) => it?.[kk] != null);
      const label = (k ? it[k] : fallback) as string;
      m.set(label, (m.get(label) || 0) + 1);
    }
    return [...m.entries()]
      .map(([label, value]) => ({ label, value }))
      .sort((a, b) => b.value - a.value);
  }

  mergePieData(arrays: PieDatum[][]): PieDatum[] {
    const m = new Map<string, number>();
    for (const arr of arrays ?? []) {
      for (const it of arr ?? []) {
        m.set(it.label, (m.get(it.label) || 0) + (it.value || 0));
      }
    }
    return [...m.entries()]
      .map(([label, value]) => ({ label, value }))
      .sort((a, b) => b.value - a.value);
  }

  // ======== Agregados para charts de eventos ========
  countByMonth(list: EventLike[]): { month: number; count: number }[] {
    const counts = Array.from({ length: 12 }, (_, m) => ({
      month: m,
      count: 0,
    }));
    for (const ev of list ?? []) {
      const d = this.toDate(ev?.start);
      if (!d) continue;
      counts[this.monthIdx(d)].count++;
    }
    return counts;
  }

  countByPlace(list: EventLike[]): { label: string; value: number }[] {
    const m = new Map<string, number>();
    for (const ev of list ?? []) {
      const key = this.getPlaceName(ev) || 'Sin espacio';
      m.set(key, (m.get(key) || 0) + 1);
    }
    return [...m.entries()]
      .map(([label, value]) => ({ label, value }))
      .sort((a, b) => b.value - a.value);
  }

  countByWeek(list: EventLike[]): { week: number; count: number }[] {
    const weekMap = new Map<number, number>();
    for (const ev of list ?? []) {
      const d = this.toDate(ev?.start);
      if (!d) continue;
      const w = this.weekOfYear(d);
      weekMap.set(w, (weekMap.get(w) || 0) + 1);
    }
    return [...weekMap.entries()]
      .sort((a, b) => a[0] - b[0])
      .map(([week, count]) => ({ week, count }));
  }

  // ======== Construcción del ViewModel del dashboard ========
  buildDashboardVM({
    visible,
    all,
    latest,
    year,
    variant,
    keyword,
  }: {
    visible: EventLike[];
    all: EventLike[];
    latest: EventLike[];
    year: number;
    variant: PeriodicVariant;
    keyword?: string;
  }): DashboardVM {
    const vis = visible ?? [];
    const a = all ?? [];
    const l = latest ?? [];

    // Por mes / semana (sobre visibles)
    const byMonth = this.countByMonth(vis);
    const byWeek = this.countByWeek(vis);

    // Únicos / repetidos (sobre año completo)
    const unicos = l.length;
    const total = a.length;
    const repetidos = Math.max(total - unicos, 0);
    const promedioMes = total ? +(total / 12).toFixed(1) : 0;

    // Próximo evento (sobre visibles)
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const next = vis
      .map((e) => ({ e, d: this.toDate(e?.start) }))
      .filter((x): x is { e: EventLike; d: Date } => !!x.d && x.d >= today)
      .sort((x, y) => +x.d - +y.d)[0];

    // Por espacio (sobre año completo)
    const byPlace = this.countByPlace(a);

    return {
      year,
      variant,
      visible: vis,
      all: a,
      latest: l,
      kpis: {
        total,
        unicos,
        repetidos,
        promedioMes,
        proximoEvento: next
          ? { title: (next.e?.title ?? 'Evento') as string, date: next.d }
          : null,
      },
      charts: {
        byMonth,
        byWeek,
        uniqueVsRepeated: [
          { label: 'Únicos', value: unicos },
          { label: 'Repetidos', value: repetidos },
        ],
        byPlace,
      },
    };
  }

  // ======== Helper genérico para “año o histórico” (quesitos) ========
  pieByYearOrHistoric<T>({
    viewYear$,
    years,
    fetchYear,
    group,
  }: {
    viewYear$: any;
    years: number[];
    fetchYear: (y: number) => any; // Observable<T[]>
    group: (xs: T[]) => PieDatum[];
  }) {
    return viewYear$.pipe(
      switchMap((y: number | 'historic') => {
        if (y === 'historic') {
          return forkJoin(years.map(fetchYear)).pipe(
            map((lists: T[][]) => this.mergePieData(lists.map(group))),
            catchError(() => of([] as PieDatum[]))
          );
        }
        return fetchYear(y as number).pipe(
          map((arr: T[]) => group(arr)),
          catchError(() => of([] as PieDatum[]))
        );
      })
    );
  }

  // ======== Serie anual de socias ========
  countPartnersByYear(
    partners: any[],
    start: number,
    end: number
  ): AnnualPoint[] {
    const out: AnnualPoint[] = [];
    for (let y = start; y <= end; y++) {
      const count = (partners ?? []).reduce((acc: number, p: any) => {
        const cuotas = Array.isArray(p?.cuotas) ? p.cuotas : [];
        return acc + (cuotas.includes(y) ? 1 : 0);
      }, 0);
      out.push({ label: y, count });
    }
    return out;
  } /** Normaliza strings genéricamente */
  private norm(v: unknown): string {
    if (v == null) return 'DESCONOCIDO';
    const s = String(v).trim();
    return s ? s.toUpperCase() : 'DESCONOCIDO';
  }

  /** Convierte un map de conteos a PieDatum[] ordenado desc */
  toPieData(map: Record<string, number>): PieDatum[] {
    return Object.entries(map)
      .map(([label, value]) => ({ label, value }))
      .sort((a, b) => b.value - a.value);
  }

  /** Agrupa eventos por tipo de acceso (campo `access`) */
  groupEventsByAccess = (events: Array<{ access?: string }>): PieDatum[] => {
    const acc: Record<string, number> = {};
    for (const e of events) {
      const key = this.norm(e?.access);
      acc[key] = (acc[key] ?? 0) + 1;
    }
    return this.toPieData(acc);
  };

  /** Agrupa por categorías (campo `category` es string[] en cada evento) */
  groupEventsByCategory = (
    events: Array<{ category?: string[] }>
  ): PieDatum[] => {
    const acc: Record<string, number> = {};
    for (const e of events) {
      const cats = Array.isArray(e?.category) ? e.category : [];
      // cuenta cada categoría del evento
      for (const c of cats) {
        const key = this.norm(c);
        acc[key] = (acc[key] ?? 0) + 1;
      }
      // si no tiene categorías, opcional: cuenta como SIN CATEGORÍA
      if (cats.length === 0) {
        acc['SIN CATEGORÍA'] = (acc['SIN CATEGORÍA'] ?? 0) + 1;
      }
    }
    return this.toPieData(acc);
  };
}
