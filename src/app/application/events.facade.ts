import { inject, Injectable } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import {
  BehaviorSubject,
  catchError,
  EMPTY,
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

// Filtro actual para poder recargar exactamente lo que toca
type CurrentFilter =
  | { kind: 'year'; year: number; variant: PeriodicVariant } // carga una lista concreta
  | { kind: 'bundle'; year: number } // carga all+latest en paralelo
  | { kind: 'none' }; // estado inicial / reseteo

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

  // Lista visible (según vista/filtro + búsquedas)
  private readonly visibleEventsSubject = new BehaviorSubject<
    EventModelFullData[] | null
  >(null);

  private readonly selectedEventSubject =
    new BehaviorSubject<EventModelFullData | null>(null);

  // ------- Streams públicos -------
  readonly eventsAll$ = this.eventsAllSubject.asObservable();
  readonly eventsNonRepeteatedSubject$ =
    this.eventsNonRepeteatedSubject.asObservable();
  readonly visibleEvents$ = this.visibleEventsSubject.asObservable();
  readonly selectedEvent$ = this.selectedEventSubject.asObservable();

  private current: CurrentFilter = { kind: 'none' };

  // ================= CARGA =================

  /** Carga “all” y “latest” en paralelo y deja “latest” como visible por defecto. */
  loadYearBundle(year: number): void {
    this.current = { kind: 'bundle', year };
    this.executeWithLoading(
      forkJoin({
        all: this.eventsService.getEventsByYear(year, 'all'),
        latest: this.eventsService.getEventsByYear(year, 'latest'),
      }),
      ({ all, latest }: BundleResult) => {
        this.updateEventsState({ all, latest, visibleSource: 'latest' });
      }
    );
  }

  /** Carga solo la variante indicada (all | latest) y la deja visible. */
  loadEventsByYear(year: number, variant: PeriodicVariant): void {
    this.current = { kind: 'year', year, variant };
    this.executeWithLoading(
      this.eventsService.getEventsByYear(year, variant),
      (list) =>
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

  /** Equivalente a tu loadEventsAllByYear(year). */
  loadEventsAllByYear(year: number): void {
    this.loadEventsByYear(year, 'all');
  }

  loadEventById(id: number): void {
    this.executeWithLoading(this.eventsService.getEventById(id), (event) =>
      this.selectedEventSubject.next(event)
    );
  }

  loadEventsByPeriodicId(periodicId: string): Observable<EventModelFullData[]> {
    return this.wrapWithLoading(
      this.eventsService.getEventsByPeriodicId(periodicId)
    );
  }

  // ================= CRUD =================

  addEvent(fd: FormData): Observable<FormData> {
    return this.wrapWithLoading(this.eventsService.add(fd)).pipe(
      takeUntilDestroyed(this.destroyRef),
      tap(() => this.reloadCurrentFilter()),
      catchError((err) => {
        this.generalService.handleHttpError(err);
        return EMPTY;
      })
    );
  }

  editEvent(fd: FormData): Observable<FormData> {
    return this.wrapWithLoading(this.eventsService.edit(fd)).pipe(
      takeUntilDestroyed(this.destroyRef),
      tap(() => this.reloadCurrentFilter()),
      catchError((err) => {
        this.generalService.handleHttpError(err);
        return EMPTY;
      })
    );
  }

  updateEvent(id: number, fd: FormData): Observable<FormData> {
    return this.wrapWithLoading(this.eventsService.updateEvent(id, fd)).pipe(
      takeUntilDestroyed(this.destroyRef),
      tap(() => this.reloadCurrentFilter()),
      catchError((err) => {
        this.generalService.handleHttpError(err);
        return EMPTY;
      })
    );
  }

  deleteEvent(id: number): void {
    this.executeWithLoading(this.eventsService.delete(id), () =>
      this.reloadCurrentFilter()
    );
  }

  deleteEventsByPeriodicIdExcept(
    periodicId: string,
    keepId: number
  ): Observable<void> {
    return this.wrapWithLoading(
      this.eventsService.deleteEventsByPeriodicIdExcept(periodicId, keepId)
    ).pipe(
      takeUntilDestroyed(this.destroyRef),
      catchError((err) => {
        this.generalService.handleHttpError(err);
        return EMPTY;
      })
    );
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
    const save$ =
      isEdit && eventId
        ? this.eventsService.updateEvent(eventId, fd)
        : this.eventsService.add(fd);

    return this.wrapWithLoading(
      save$.pipe(
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
        tap(() => this.reloadCurrentFilter())
      )
    ).pipe(
      takeUntilDestroyed(this.destroyRef),
      catchError((err) => {
        this.generalService.handleHttpError(err);
        return EMPTY;
      })
    );
  }

  // ================= BUSCADOR =================

  /**
   * Aplica búsqueda sobre la fuente adecuada según el filtro actual:
   * - Si visible proviene de “latest”, busca en latest.
   * - Si visible proviene de “all”, busca en all.
   */
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
      // Resetea a la base sin filtrar
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
        // Nada que recargar
        break;
    }
  }

  /**
   * Actualiza `eventsAllSubject`, `eventsNonRepeteatedSubject` y decide qué entra en `visibleEventsSubject`.
   * Cualquier campo no incluido se mantiene como está (permite cargas parciales).
   */
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
}
