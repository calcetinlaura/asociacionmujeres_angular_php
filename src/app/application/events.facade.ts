import { inject, Injectable } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import {
  BehaviorSubject,
  catchError,
  EMPTY,
  finalize,
  forkJoin,
  iif,
  Observable,
  of,
  switchMap,
  take,
  tap,
} from 'rxjs';
import { EventModelFullData } from 'src/app/core/interfaces/event.interface';
import { EventsService } from 'src/app/core/services/events.services';
import { includesNormalized, toSearchKey } from '../shared/utils/text.utils';
import { LoadableFacade } from './loadable.facade';

// ================= Tipos públicos =================
export type PeriodicView = 'all' | 'groupedByPeriodicId';
export type PublishScope = 'published' | 'drafts' | 'scheduled' | 'all';

// Para bundle (carga doble)
type BundleResult = {
  all: EventModelFullData[];
  grouped: EventModelFullData[];
};

type CurrentFilter =
  | { kind: 'year'; year: number; view: PeriodicView; scope: PublishScope }
  | { kind: 'bundle'; year: number; scope: PublishScope }
  | { kind: 'none' };

@Injectable({ providedIn: 'root' })
export class EventsFacade extends LoadableFacade {
  private readonly eventsService = inject(EventsService);

  // ------- Estado interno -------
  private readonly allEventsSubject = new BehaviorSubject<
    EventModelFullData[] | null
  >(null); // view=all
  private readonly groupedEventsSubject = new BehaviorSubject<
    EventModelFullData[] | null
  >(null); // view=groupedByPeriodicId
  public isVisiblePublic(e: EventModelFullData, now = new Date()): boolean {
    return this.isPublishedVisible(e, now);
  }
  private readonly visibleEventsSubject = new BehaviorSubject<
    EventModelFullData[] | null
  >(null);
  private readonly selectedEventSubject =
    new BehaviorSubject<EventModelFullData | null>(null);

  // LandingSection (split en upcoming/past)
  private readonly landingUpcomingEventsSubject = new BehaviorSubject<
    EventModelFullData[] | null
  >(null);
  private readonly landingPastEventsSubject = new BehaviorSubject<
    EventModelFullData[] | null
  >(null);

  // Loaders
  private readonly isListLoadingSubject = new BehaviorSubject<boolean>(false);
  private readonly isItemLoadingSubject = new BehaviorSubject<boolean>(false);

  // ------- Streams públicos -------
  readonly allEvents$ = this.allEventsSubject.asObservable();
  readonly groupedEvents$ = this.groupedEventsSubject.asObservable();
  readonly visibleEvents$ = this.visibleEventsSubject.asObservable();
  readonly selectedEvent$ = this.selectedEventSubject.asObservable();

  readonly landingUpcomingEvents$ =
    this.landingUpcomingEventsSubject.asObservable();
  readonly landingPastEvents$ = this.landingPastEventsSubject.asObservable();

  readonly isListLoading$ = this.isListLoadingSubject.asObservable();
  readonly isItemLoading$ = this.isItemLoadingSubject.asObservable();

  private current: CurrentFilter = { kind: 'none' };

  // Draft para prefijar valores en formularios
  private readonly draftEventSubject =
    new BehaviorSubject<Partial<EventModelFullData> | null>(null);
  readonly draftEvent$ = this.draftEventSubject.asObservable();

  // ================= Utils internos =================

  // —— Filtros de respaldo por scope ——
  // (Si el backend ya filtra por scope, puedes devolver 'list' tal cual en applyScopeFallback)
  private isDraft(e: EventModelFullData): boolean {
    return !e.published || Number(e.published) === 0;
  }
  private parsePublishDate(e: EventModelFullData): Date | null {
    const day = (e.publish_day || '').trim();
    const time = (e.publish_time || '').trim() || '00:00:00';
    if (!day) return null;
    const iso = `${day}T${time.length === 5 ? time + ':00' : time}`;
    const d = new Date(iso);
    return Number.isNaN(d.getTime()) ? null : d;
  }
  private isPublishedVisible(e: EventModelFullData, now = new Date()): boolean {
    if (Number(e.published) !== 1) return false;
    const dt = this.parsePublishDate(e);
    if (!dt) return true; // sin fecha/hora → visible
    return dt.getTime() <= now.getTime();
  }
  private isScheduled(e: EventModelFullData, now = new Date()): boolean {
    if (Number(e.published) !== 1) return false;
    const dt = this.parsePublishDate(e);
    if (!dt) return false;
    return dt.getTime() > now.getTime();
  }
  private applyScopeFallback(
    list: EventModelFullData[] | null
  ): EventModelFullData[] | null {
    if (!list) return list;
    if (this.current.kind === 'none') return list;

    const now = new Date();
    switch (this.current.scope) {
      case 'published':
        return list.filter((e) => this.isPublishedVisible(e, now));
      case 'drafts':
        return list.filter((e) => this.isDraft(e));
      case 'scheduled':
        return list.filter((e) => this.isScheduled(e, now));
      case 'all':
      default:
        return list;
    }
  }

  /** Divide en upcoming vs past tomando "hoy" (según `start`). */
  private splitUpcomingPastThisYear(
    list: EventModelFullData[],
    now = new Date()
  ): { upcoming: EventModelFullData[]; past: EventModelFullData[] } {
    const startOfToday = new Date(now);
    startOfToday.setHours(0, 0, 0, 0);

    const parseStart = (e: EventModelFullData) => {
      const d = new Date(e.start as any);
      return Number.isNaN(d.getTime()) ? null : d;
    };

    const upcoming: EventModelFullData[] = [];
    const past: EventModelFullData[] = [];

    for (const e of list) {
      const d = parseStart(e);
      if (!d) {
        upcoming.push(e);
        continue;
      }
      if (d.getTime() >= startOfToday.getTime()) upcoming.push(e);
      else past.push(e);
    }

    // Orden útil para UI
    upcoming.sort(
      (a, b) =>
        new Date(a.start as any).getTime() - new Date(b.start as any).getTime()
    ); // asc
    past.sort(
      (a, b) =>
        new Date(b.start as any).getTime() - new Date(a.start as any).getTime()
    ); // desc

    return { upcoming, past };
  }

  private setVisibleFromView(view: PeriodicView): void {
    const src =
      view === 'all'
        ? this.allEventsSubject.getValue()
        : this.groupedEventsSubject.getValue();
    this.visibleEventsSubject.next(src ?? null);
  }

  // ================= CARGA GENÉRICA =================

  /** Carga ambas vistas (all y grouped) para un año y scope. Deja visible la agrupada. */
  loadYearBundle(year: number, scope: PublishScope = 'published'): void {
    this.current = { kind: 'bundle', year, scope };
    this.isListLoadingSubject.next(true);

    forkJoin({
      all: this.eventsService.getEventsByYear(
        year,
        'all',
        'all' === scope ? 'all' : scope
      ),
      grouped: this.eventsService.getEventsByYear(
        year,
        'groupedByPeriodicId',
        'all' === scope ? 'all' : scope
      ),
    })
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        catchError((err) => {
          this.generalService.handleHttpError(err);
          return of({ all: [], grouped: [] } as BundleResult);
        }),
        finalize(() => this.isListLoadingSubject.next(false))
      )
      .subscribe(({ all, grouped }) => {
        const allScoped = this.applyScopeFallback(all);
        const groupedScoped = this.applyScopeFallback(grouped);

        if (allScoped) this.allEventsSubject.next(allScoped);
        if (groupedScoped) this.groupedEventsSubject.next(groupedScoped);

        this.setVisibleFromView('groupedByPeriodicId');
      });
  }

  loadEventsByYear(
    year: number,
    view: PeriodicView,
    scope: PublishScope = 'all'
  ): void {
    this.current = { kind: 'year', year, view, scope };
    this.isListLoadingSubject.next(true);

    this.eventsService
      .getEventsByYear(year, view, scope)
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        catchError((err) => {
          this.generalService.handleHttpError(err);
          return of([] as EventModelFullData[]);
        }),
        finalize(() => this.isListLoadingSubject.next(false))
      )
      .subscribe((list) => {
        const scoped = this.applyScopeFallback(list) ?? [];

        if (view === 'all') {
          this.allEventsSubject.next(scoped);
        } else {
          this.groupedEventsSubject.next(scoped);
        }

        // ✅ deja visible exactamente lo que acabas de cargar
        this.visibleEventsSubject.next(scoped);
      });
  }

  // ================= MODOS QUE PEDISTE =================

  /** landingCalendar: por años, publicados y NO agrupados */
  loadLandingCalendar(year: number): void {
    this.loadEventsByYear(year, 'all', 'published');
  }

  /**
   * landingSection: por años, publicados y AGRUPADOS.
   * Split en upcoming (hoy→) y past (←ayer) dentro del año.
   */
  loadLandingSection(year: number): void {
    this.current = {
      kind: 'year',
      year,
      view: 'groupedByPeriodicId',
      scope: 'published',
    };
    this.isListLoadingSubject.next(true);

    this.eventsService
      .getEventsByYear(year, 'groupedByPeriodicId', 'published')
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        catchError((err) => {
          this.generalService.handleHttpError(err);
          return of([] as EventModelFullData[]);
        }),
        finalize(() => this.isListLoadingSubject.next(false))
      )
      .subscribe((list) => {
        const scoped = this.applyScopeFallback(list) ?? [];
        this.groupedEventsSubject.next(scoped);
        this.setVisibleFromView('groupedByPeriodicId');

        const { upcoming, past } = this.splitUpcomingPastThisYear(scoped);
        this.landingUpcomingEventsSubject.next(upcoming);
        this.landingPastEventsSubject.next(past);
      });
  }

  /** dashboard: por años, publicados y no publicados, NO agrupados */
  loadDashboardAllNotGrouped(year: number): void {
    this.loadEventsByYear(year, 'all', 'all');
  }

  /** dashboard: por años, publicados y no publicados, AGRUPADOS */
  loadDashboardAllGrouped(year: number): void {
    this.loadEventsByYear(year, 'groupedByPeriodicId', 'all');
  }

  /** dashboard: SOLO borradores (por defecto no agrupado; puedes pasar 'groupedByPeriodicId') */
  loadDashboardDrafts(year: number, view: PeriodicView = 'all'): void {
    this.loadEventsByYear(year, view, 'drafts');
  }

  /** dashboard: SOLO programados (por defecto no agrupado; puedes pasar 'groupedByPeriodicId') */
  loadDashboardScheduled(year: number, view: PeriodicView = 'all'): void {
    this.loadEventsByYear(year, view, 'scheduled');
  }

  loadDashboardPublished(year: number, view: PeriodicView = 'all'): void {
    this.loadDashboardByScope(year, 'published', view);
  }
  loadDashboardByScope(
    year: number,
    scope: PublishScope,
    view: PeriodicView = 'all'
  ): void {
    this.isListLoadingSubject.next(true);

    this.eventsService
      .getEventsByYear(year, view, scope)
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        catchError((err) => {
          this.generalService.handleHttpError(err);
          return of([] as EventModelFullData[]);
        }),
        finalize(() => this.isListLoadingSubject.next(false))
      )
      .subscribe((list) => {
        const scoped = this.applyScopeFallback(list) ?? [];
        if (view === 'all') {
          this.allEventsSubject.next(scoped);
          this.visibleEventsSubject.next(scoped);
        } else {
          this.groupedEventsSubject.next(scoped);
          this.visibleEventsSubject.next(scoped);
        }
      });
  }
  loadDashboardDraftsAllYears(
    view: PeriodicView = 'groupedByPeriodicId'
  ): void {
    this.isListLoadingSubject.next(true);
    this.current = { kind: 'none' }; // no hay filtro por año
    this.eventsService
      .getAllByScope(view, 'drafts')
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        catchError((err) => {
          this.generalService.handleHttpError(err);
          return of([] as EventModelFullData[]);
        }),
        finalize(() => this.isListLoadingSubject.next(false))
      )
      .subscribe((list) => {
        const scoped = this.applyScopeFallback(list) ?? [];
        if (view === 'all') this.allEventsSubject.next(scoped);
        else this.groupedEventsSubject.next(scoped);
        this.visibleEventsSubject.next(scoped);
      });
  }

  // Sólo programados (todos los años)
  loadDashboardScheduledAllYears(
    view: PeriodicView = 'groupedByPeriodicId'
  ): void {
    this.isListLoadingSubject.next(true);
    this.current = { kind: 'none' };
    this.eventsService
      .getAllByScope(view, 'scheduled')
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        catchError((err) => {
          this.generalService.handleHttpError(err);
          return of([] as EventModelFullData[]);
        }),
        finalize(() => this.isListLoadingSubject.next(false))
      )
      .subscribe((list) => {
        const scoped = this.applyScopeFallback(list) ?? [];
        if (view === 'all') this.allEventsSubject.next(scoped);
        else this.groupedEventsSubject.next(scoped);
        this.visibleEventsSubject.next(scoped);
      });
  }
  // ================= ITEM & PERIODIC HELPERS =================

  loadEventById(id: number): void {
    this.isItemLoadingSubject.next(true);
    this.selectedEventSubject.next(null);

    this.eventsService
      .getEventById(id)
      .pipe(
        take(1),
        catchError((err) => {
          this.generalService.handleHttpError(err);
          return of(null);
        }),
        finalize(() => this.isItemLoadingSubject.next(false))
      )
      .subscribe((event) => {
        this.selectedEventSubject.next(event);
      });
  }

  /** Para modales/listas dependientes. No toca estado global. */
  loadEventsByPeriodicId(periodicId: string): Observable<EventModelFullData[]> {
    this.isItemLoadingSubject.next(true);
    return this.eventsService.getEventsByPeriodicId(periodicId).pipe(
      takeUntilDestroyed(this.destroyRef),
      catchError((err) => {
        this.generalService.handleHttpError(err);
        return of([] as EventModelFullData[]);
      }),
      finalize(() => this.isItemLoadingSubject.next(false))
    );
  }

  // ================= CRUD =================

  addEvent(fd: FormData): Observable<FormData> {
    this.isItemLoadingSubject.next(true);
    return this.eventsService.add(fd).pipe(
      takeUntilDestroyed(this.destroyRef),
      tap(() => this.reloadCurrentFilter()),
      catchError((err) => {
        this.generalService.handleHttpError(err);
        return EMPTY;
      }),
      finalize(() => this.isItemLoadingSubject.next(false))
    );
  }

  editEvent(fd: FormData): Observable<FormData> {
    this.isItemLoadingSubject.next(true);
    return this.eventsService.edit(fd).pipe(
      takeUntilDestroyed(this.destroyRef),
      tap(() => this.reloadCurrentFilter()),
      catchError((err) => {
        this.generalService.handleHttpError(err);
        return EMPTY;
      }),
      finalize(() => this.isItemLoadingSubject.next(false))
    );
  }

  updateEvent(id: number, fd: FormData): Observable<FormData> {
    this.isItemLoadingSubject.next(true);
    return this.eventsService.updateEvent(id, fd).pipe(
      takeUntilDestroyed(this.destroyRef),
      tap(() => this.reloadCurrentFilter()),
      catchError((err) => {
        this.generalService.handleHttpError(err);
        return EMPTY;
      }),
      finalize(() => this.isItemLoadingSubject.next(false))
    );
  }

  deleteEvent(id: number): void {
    this.isItemLoadingSubject.next(true);
    this.eventsService
      .delete(id)
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        catchError((err) => {
          this.generalService.handleHttpError(err);
          return of(null);
        }),
        finalize(() => this.isItemLoadingSubject.next(false))
      )
      .subscribe(() => this.reloadCurrentFilter());
  }

  /**
   * Guardado inteligente: si un evento pasa de periódico a único,
   * borra “hermanos” del mismo periodic_id (excepto el actual).
   */
  saveEventSmart(
    fd: FormData,
    isEdit: boolean,
    eventId?: number
  ): Observable<any> {
    this.isItemLoadingSubject.next(true);

    const save$ =
      isEdit && eventId
        ? this.eventsService.updateEvent(eventId, fd)
        : this.eventsService.add(fd);

    return save$.pipe(
      switchMap((resp: any) => {
        const periodic = fd.get('periodic') === '1';
        const periodicId = fd.get('periodic_id')?.toString() || '';
        const id = isEdit ? eventId : resp?.id;

        return iif(
          () => !periodic && !!periodicId && !!id,
          this.eventsService.deleteEventsByPeriodicIdExcept(periodicId, +id!),
          of(null)
        );
      }),
      tap(() => this.reloadCurrentFilter()),
      takeUntilDestroyed(this.destroyRef),
      catchError((err) => {
        this.generalService.handleHttpError(err);
        return EMPTY;
      }),
      finalize(() => this.isItemLoadingSubject.next(false))
    );
  }

  deleteEventsByPeriodicIdExcept(
    periodicId: string,
    keepId: number
  ): Observable<void> {
    this.isItemLoadingSubject.next(true);
    return this.eventsService
      .deleteEventsByPeriodicIdExcept(periodicId, keepId)
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        catchError((err) => {
          this.generalService.handleHttpError(err);
          return EMPTY;
        }),
        finalize(() => this.isItemLoadingSubject.next(false))
      );
  }

  // ================= BUSCADOR =================
  applyFilterWord(keyword: string): void {
    const base =
      this.current.kind === 'year' && this.current.view === 'all'
        ? this.allEventsSubject.getValue()
        : this.groupedEventsSubject.getValue() ??
          this.visibleEventsSubject.getValue();

    if (!base) {
      this.visibleEventsSubject.next(base);
      return;
    }
    if (!toSearchKey(keyword)) {
      this.visibleEventsSubject.next(base);
      return;
    }

    const filtered = base.filter((e) =>
      [e.title].some((field) => includesNormalized(field, keyword))
    );

    this.visibleEventsSubject.next(filtered);
  }

  clearSelectedEvent(): void {
    this.selectedEventSubject.next(null);
  }

  // ================= Helpers internos =================
  private reloadCurrentFilter(): void {
    switch (this.current.kind) {
      case 'bundle':
        this.loadYearBundle(this.current.year, this.current.scope);
        break;
      case 'year':
        this.loadEventsByYear(
          this.current.year,
          this.current.view,
          this.current.scope
        );
        break;
      case 'none':
      default:
        break;
    }
  }

  // Draft helpers
  prefill(draft: Partial<EventModelFullData>): void {
    this.draftEventSubject.next(draft);
  }
  prefillDate(iso: string): void {
    this.prefill({ start: iso });
  }
  clearDraft(): void {
    this.draftEventSubject.next(null);
  }
}
