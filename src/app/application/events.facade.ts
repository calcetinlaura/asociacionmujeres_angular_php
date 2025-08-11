import { DestroyRef, inject, Injectable } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import {
  BehaviorSubject,
  catchError,
  Observable,
  of,
  switchMap,
  tap,
} from 'rxjs';
import { EventModelFullData } from '../core/interfaces/event.interface';
import { EventsService } from '../core/services/events.services';
import { GeneralService } from '../shared/services/generalService.service';

@Injectable({ providedIn: 'root' })
export class EventsFacade {
  private readonly destroyRef = inject(DestroyRef);
  private readonly eventsService = inject(EventsService);
  private readonly generalService = inject(GeneralService);

  private readonly eventsAllSubject = new BehaviorSubject<
    EventModelFullData[] | null
  >(null);
  private readonly nonRepeatedEventsSubject = new BehaviorSubject<
    EventModelFullData[] | null
  >(null);
  private readonly selectedEventSubject =
    new BehaviorSubject<EventModelFullData | null>(null);

  eventsAll$ = this.eventsAllSubject.asObservable();
  nonRepeatedEvents$ = this.nonRepeatedEventsSubject.asObservable();
  selectedEvent$ = this.selectedEventSubject.asObservable();

  currentFilter: number | null = null;

  // ---------- Filtros ----------
  setCurrentFilter(year: number | null): void {
    this.currentFilter = year;
  }

  private reloadCurrentFilter(): void {
    if (this.currentFilter !== null) {
      this.loadEventsAllByYear(this.currentFilter);
      this.loadNonRepeatedEventsByYear(this.currentFilter);
    }
  }

  // ---------- Carga de eventos ----------
  loadEventsAllByYear(year: number): void {
    this.eventsService
      .getEventsByYear(year, 'all')
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        tap((events) => this.eventsAllSubject.next(events)),
        this.catchAndLog()
      )
      .subscribe();
  }

  loadNonRepeatedEventsByYear(year: number): void {
    this.setCurrentFilter(year);
    this.eventsService
      .getEventsByYear(year, 'latest')
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        tap((events) => this.nonRepeatedEventsSubject.next(events)),
        this.catchAndLog()
      )
      .subscribe();
  }

  loadEventById(id: number): void {
    this.eventsService
      .getEventById(id)
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        tap((event) => this.selectedEventSubject.next(event)),
        this.catchAndLog()
      )
      .subscribe();
  }

  loadEventsByPeriodicId(periodicId: string): Observable<EventModelFullData[]> {
    return this.eventsService
      .getEventsByPeriodicId(periodicId)
      .pipe(this.catchAndLog());
  }

  // ---------- Guardar / Editar ----------
  addEvent(event: FormData): Observable<FormData> {
    return this.eventsService.add(event).pipe(this.catchAndLog());
  }

  editEvent(id: number, event: FormData): Observable<FormData> {
    return this.eventsService.edit(id, event).pipe(this.catchAndLog());
  }

  updateEvent(id: number, event: FormData): Observable<FormData> {
    return this.eventsService.updateEvent(id, event).pipe(this.catchAndLog());
  }

  // ---------- Eliminar ----------
  deleteEvent(id: number): void {
    this.eventsService
      .delete(id)
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        tap(() => this.reloadCurrentFilter()),
        this.catchAndLog()
      )
      .subscribe();
  }

  deleteEventsByPeriodicIdExcept(
    periodicId: string,
    keepId: number
  ): Observable<void> {
    return this.eventsService
      .deleteEventsByPeriodicIdExcept(periodicId, keepId)
      .pipe(this.catchAndLog());
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

    return save$.pipe(
      switchMap((response: any) => {
        const periodic = event.get('periodic') === '1';
        const periodicId = event.get('periodic_id')?.toString() || '';
        const id = isEdit ? eventId : response?.id;

        if (!periodic && periodicId && id) {
          return this.eventsService
            .deleteEventsByPeriodicIdExcept(periodicId, +id)
            .pipe(tap(() => this.reloadCurrentFilter()));
        }

        return of(null).pipe(tap(() => this.reloadCurrentFilter()));
      }),
      this.catchAndLog()
    );
  }

  // ---------- Utilidades ----------
  clearSelectedEvent(): void {
    this.selectedEventSubject.next(null);
  }

  applyFilterWord(keyword: string): void {
    const currentEvents = this.nonRepeatedEventsSubject.getValue();
    const search = keyword.trim().toLowerCase();

    if (!search || !currentEvents) {
      this.nonRepeatedEventsSubject.next(currentEvents);
      return;
    }

    const filtered = currentEvents.filter((event) =>
      event.title.toLowerCase().includes(search)
    );
    this.nonRepeatedEventsSubject.next(filtered);
  }

  private catchAndLog<T>() {
    return catchError<T, Observable<never>>((err) => {
      this.generalService.handleHttpError(err);
      throw err;
    });
  }
}
