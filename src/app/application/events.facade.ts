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
  tap,
} from 'rxjs';
import { EventModelFullData } from 'src/app/core/interfaces/event.interface';
import { EventsService } from 'src/app/core/services/events.services';
import { includesNormalized, toSearchKey } from '../shared/utils/text.utils';
import { LoadableFacade } from './loadable.facade';

export type PeriodicVariant = 'all' | 'latest';
type BundleResult = { all: EventModelFullData[]; latest: EventModelFullData[] };

type CurrentFilter =
  | { kind: 'year'; year: number; variant: PeriodicVariant }
  | { kind: 'bundle'; year: number }
  | { kind: 'none' };

@Injectable({ providedIn: 'root' })
export class EventsFacade extends LoadableFacade {
  private readonly eventsService = inject(EventsService);

  // ------- State interno -------
  private readonly eventsAllSubject = new BehaviorSubject<
    EventModelFullData[] | null
  >(null);
  private readonly eventsNonRepeteatedSubject = new BehaviorSubject<
    EventModelFullData[] | null
  >(null);
  private readonly visibleEventsSubject = new BehaviorSubject<
    EventModelFullData[] | null
  >(null);
  private readonly selectedEventSubject =
    new BehaviorSubject<EventModelFullData | null>(null);

  // NEW: loaders separados
  private readonly listLoadingSubject = new BehaviorSubject<boolean>(false);
  private readonly itemLoadingSubject = new BehaviorSubject<boolean>(false);

  // ------- Streams públicos -------
  readonly eventsAll$ = this.eventsAllSubject.asObservable();
  readonly eventsNonRepeteatedSubject$ =
    this.eventsNonRepeteatedSubject.asObservable();
  readonly visibleEvents$ = this.visibleEventsSubject.asObservable();
  readonly selectedEvent$ = this.selectedEventSubject.asObservable();

  // NEW: expón loaders a la UI
  readonly isLoadingList$ = this.listLoadingSubject.asObservable();
  readonly isLoadingItem$ = this.itemLoadingSubject.asObservable();

  private current: CurrentFilter = { kind: 'none' };

  // Draft para prefijar valores en el form
  private readonly draftEventSubject =
    new BehaviorSubject<Partial<EventModelFullData> | null>(null);
  readonly draftEvent$ = this.draftEventSubject.asObservable();

  // ================= CARGA =================

  /** Carga “all” y “latest” en paralelo y deja “latest” como visible por defecto. */
  loadYearBundle(year: number): void {
    this.current = { kind: 'bundle', year };
    this.listLoadingSubject.next(true);
    forkJoin({
      all: this.eventsService.getEventsByYear(year, 'all'),
      latest: this.eventsService.getEventsByYear(year, 'latest'),
    })
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        catchError((err) => {
          this.generalService.handleHttpError(err);
          return of({ all: [], latest: [] } as BundleResult);
        }),
        finalize(() => this.listLoadingSubject.next(false))
      )
      .subscribe(({ all, latest }: BundleResult) => {
        this.updateEventsState({ all, latest, visibleSource: 'latest' });
      });
  }

  /** Carga solo la variante indicada (all | latest) y la deja visible. */
  loadEventsByYear(year: number, variant: PeriodicVariant): void {
    this.current = { kind: 'year', year, variant };
    this.listLoadingSubject.next(true);
    this.eventsService
      .getEventsByYear(year, variant)
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        catchError((err) => {
          this.generalService.handleHttpError(err);
          return of([] as EventModelFullData[]);
        }),
        finalize(() => this.listLoadingSubject.next(false))
      )
      .subscribe((list) =>
        this.updateEventsState(
          variant === 'all'
            ? { all: list, visibleSource: 'all' }
            : { latest: list, visibleSource: 'latest' }
        )
      );
  }

  loadNonRepeatedEventsByYear(year: number): void {
    this.loadEventsByYear(year, 'latest');
  }

  loadEventsAllByYear(year: number): void {
    this.loadEventsByYear(year, 'all');
  }

  loadEventById(id: number): void {
    this.itemLoadingSubject.next(true);
    this.eventsService
      .getEventById(id)
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        catchError((err) => {
          this.generalService.handleHttpError(err);
          return of(null);
        }),
        finalize(() => this.itemLoadingSubject.next(false))
      )
      .subscribe((event) => this.selectedEventSubject.next(event));
  }

  /** Útil para modales/listas dependientes. No toca el estado global. */
  loadEventsByPeriodicId(periodicId: string): Observable<EventModelFullData[]> {
    this.itemLoadingSubject.next(true);
    return this.eventsService.getEventsByPeriodicId(periodicId).pipe(
      takeUntilDestroyed(this.destroyRef),
      catchError((err) => {
        this.generalService.handleHttpError(err);
        return of([] as EventModelFullData[]);
      }),
      finalize(() => this.itemLoadingSubject.next(false))
    );
  }

  // ================= CRUD =================

  addEvent(fd: FormData): Observable<FormData> {
    this.itemLoadingSubject.next(true);
    return this.eventsService.add(fd).pipe(
      takeUntilDestroyed(this.destroyRef),
      tap(() => this.reloadCurrentFilter()),
      catchError((err) => {
        this.generalService.handleHttpError(err);
        return EMPTY;
      }),
      finalize(() => this.itemLoadingSubject.next(false))
    );
  }

  editEvent(fd: FormData): Observable<FormData> {
    this.itemLoadingSubject.next(true);
    return this.eventsService.edit(fd).pipe(
      takeUntilDestroyed(this.destroyRef),
      tap(() => this.reloadCurrentFilter()),
      catchError((err) => {
        this.generalService.handleHttpError(err);
        return EMPTY;
      }),
      finalize(() => this.itemLoadingSubject.next(false))
    );
  }

  updateEvent(id: number, fd: FormData): Observable<FormData> {
    this.itemLoadingSubject.next(true);
    return this.eventsService.updateEvent(id, fd).pipe(
      takeUntilDestroyed(this.destroyRef),
      tap(() => this.reloadCurrentFilter()),
      catchError((err) => {
        this.generalService.handleHttpError(err);
        return EMPTY;
      }),
      finalize(() => this.itemLoadingSubject.next(false))
    );
  }

  deleteEvent(id: number): void {
    this.itemLoadingSubject.next(true);
    this.eventsService
      .delete(id)
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        catchError((err) => {
          this.generalService.handleHttpError(err);
          return of(null);
        }),
        finalize(() => this.itemLoadingSubject.next(false))
      )
      .subscribe(() => this.reloadCurrentFilter());
  }

  /**
   * Guardado inteligente: crea/edita y, si el evento pasa de periódico a único,
   * borra los “hermanos” del mismo periodic_id (excepto el actual).
   */
  saveEventSmart(
    fd: FormData,
    isEdit: boolean,
    eventId?: number
  ): Observable<any> {
    this.itemLoadingSubject.next(true);

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
      finalize(() => this.itemLoadingSubject.next(false))
    );
  }

  deleteEventsByPeriodicIdExcept(
    periodicId: string,
    keepId: number
  ): Observable<void> {
    this.itemLoadingSubject.next(true);
    return this.eventsService
      .deleteEventsByPeriodicIdExcept(periodicId, keepId)
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        catchError((err) => {
          this.generalService.handleHttpError(err);
          return EMPTY;
        }),
        finalize(() => this.itemLoadingSubject.next(false))
      );
  }

  // ================= BUSCADOR =================
  applyFilterWord(keyword: string): void {
    const base =
      this.current.kind === 'year' && this.current.variant === 'all'
        ? this.eventsAllSubject.getValue()
        : this.eventsNonRepeteatedSubject.getValue() ??
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
        this.loadYearBundle(this.current.year);
        break;
      case 'year':
        this.loadEventsByYear(this.current.year, this.current.variant);
        break;
      case 'none':
      default:
        break;
    }
  }

  private updateEventsState(args: {
    all?: EventModelFullData[];
    latest?: EventModelFullData[];
    visibleSource: 'all' | 'latest';
  }): void {
    if (args.all) this.eventsAllSubject.next(args.all);
    if (args.latest) this.eventsNonRepeteatedSubject.next(args.latest);

    const source =
      args.visibleSource === 'all'
        ? this.eventsAllSubject.getValue()
        : this.eventsNonRepeteatedSubject.getValue();

    this.visibleEventsSubject.next(source ?? null);
  }

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
