import { inject, Injectable } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import {
  BehaviorSubject,
  catchError,
  EMPTY,
  forkJoin,
  Observable,
  switchMap,
  tap,
} from 'rxjs';
import { EventModelFullData } from 'src/app/core/interfaces/event.interface';
import { EventsService } from 'src/app/core/services/events.services';
import { includesNormalized, toSearchKey } from '../shared/utils/text.utils';
import { LoadableFacade } from './loadable.facade';

@Injectable({ providedIn: 'root' })
export class EventsFacade extends LoadableFacade {
  private readonly eventsService = inject(EventsService);

  // State propio
  private readonly eventsAllSubject = new BehaviorSubject<
    EventModelFullData[] | null
  >(null);
  private readonly nonRepeatedEventsSubject = new BehaviorSubject<
    EventModelFullData[] | null
  >(null);
  private readonly selectedEventSubject =
    new BehaviorSubject<EventModelFullData | null>(null);

  // Streams públicos
  readonly eventsAll$ = this.eventsAllSubject.asObservable();
  readonly nonRepeatedEvents$ = this.nonRepeatedEventsSubject.asObservable();
  readonly selectedEvent$ = this.selectedEventSubject.asObservable();

  // Filtro actual (año) para recargar tras add/edit/delete
  private currentFilter: number | null = null;

  // ---------- Filtros ----------
  setCurrentFilter(year: number | null): void {
    this.currentFilter = year;
  }

  private reloadCurrentFilter(): void {
    if (this.currentFilter !== null) {
      this.loadYearBundle(this.currentFilter);
    }
  }

  // ---------- Carga de eventos ----------
  /** Carga en paralelo "all" y "latest" con un único spinner. */
  loadYearBundle(year: number): void {
    this.setCurrentFilter(year);
    this.executeWithLoading(
      forkJoin({
        all: this.eventsService.getEventsByYear(year, 'all'),
        latest: this.eventsService.getEventsByYear(year, 'latest'),
      }),
      ({ all, latest }) => {
        this.eventsAllSubject.next(all);
        this.nonRepeatedEventsSubject.next(latest);
      }
    );
  }

  loadEventsAllByYear(year: number): void {
    this.executeWithLoading(
      this.eventsService.getEventsByYear(year, 'all'),
      (events) => this.eventsAllSubject.next(events)
    );
  }

  loadNonRepeatedEventsByYear(year: number): void {
    this.setCurrentFilter(year);
    this.executeWithLoading(
      this.eventsService.getEventsByYear(year, 'latest'),
      (events) => this.nonRepeatedEventsSubject.next(events)
    );
  }

  loadEventById(id: number): void {
    this.executeWithLoading(this.eventsService.getEventById(id), (event) =>
      this.selectedEventSubject.next(event)
    );
  }

  loadEventsByPeriodicId(periodicId: string): Observable<EventModelFullData[]> {
    // Devuelve el stream: envolvemos solo para spinner mínimo
    return this.wrapWithLoading(
      this.eventsService.getEventsByPeriodicId(periodicId)
    );
  }

  // ---------- Guardar / Editar ----------
  addEvent(event: FormData): Observable<FormData> {
    return this.wrapWithLoading(this.eventsService.add(event)).pipe(
      takeUntilDestroyed(this.destroyRef),
      tap(() => this.reloadCurrentFilter()),
      catchError((err) => {
        this.generalService.handleHttpError(err);
        return EMPTY;
      })
    );
  }

  editEvent(event: FormData): Observable<FormData> {
    return this.wrapWithLoading(this.eventsService.edit(event)).pipe(
      takeUntilDestroyed(this.destroyRef),
      tap(() => this.reloadCurrentFilter()),
      catchError((err) => {
        this.generalService.handleHttpError(err);
        return EMPTY;
      })
    );
  }

  updateEvent(id: number, event: FormData): Observable<FormData> {
    return this.wrapWithLoading(this.eventsService.updateEvent(id, event)).pipe(
      takeUntilDestroyed(this.destroyRef),
      tap(() => this.reloadCurrentFilter()),
      catchError((err) => {
        this.generalService.handleHttpError(err);
        return EMPTY;
      })
    );
  }

  // ---------- Eliminar ----------
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

  // ---------- Guardado inteligente (editar o crear + eliminar repetidos si cambia a único) ----------
  saveEventSmart(
    event: FormData,
    isEdit: boolean,
    eventId?: number
  ): Observable<any> {
    const save$ =
      isEdit && eventId
        ? this.eventsService.updateEvent(eventId, event)
        : this.eventsService.add(event);

    const chain$ = save$.pipe(
      switchMap((response: any) => {
        const periodic = event.get('periodic') === '1';
        const periodicId = event.get('periodic_id')?.toString() || '';
        const id = isEdit ? eventId : response?.id;

        if (!periodic && periodicId && id) {
          return this.eventsService
            .deleteEventsByPeriodicIdExcept(periodicId, +id)
            .pipe(tap(() => this.reloadCurrentFilter()));
        }

        return new Observable<null>((subscriber) => {
          subscriber.next(null);
          subscriber.complete();
        }).pipe(tap(() => this.reloadCurrentFilter()));
      })
    );

    return this.wrapWithLoading(chain$).pipe(
      takeUntilDestroyed(this.destroyRef),
      catchError((err) => {
        this.generalService.handleHttpError(err);
        return EMPTY;
      })
    );
  }

  // ---------- Utilidades ----------
  clearSelectedEvent(): void {
    this.selectedEventSubject.next(null);
  }

  applyFilterWord(keyword: string): void {
    const list = this.nonRepeatedEventsSubject.getValue();
    if (!list) {
      this.nonRepeatedEventsSubject.next(list);
      return;
    }

    // si el término está vacío tras normalizar, devolvemos la lista tal cual
    if (!toSearchKey(keyword)) {
      this.nonRepeatedEventsSubject.next(list);
      return;
    }

    const filtered = list.filter((event) =>
      // añade más campos si quieres buscar también por ellos
      [event.title].some((field) => includesNormalized(field, keyword))
    );

    this.nonRepeatedEventsSubject.next(filtered);
  }
}
