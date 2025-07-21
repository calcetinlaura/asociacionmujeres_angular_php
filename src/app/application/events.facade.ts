import { DestroyRef, inject, Injectable } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { BehaviorSubject, catchError, Observable, tap } from 'rxjs';
import { EventsService } from 'src/app/core/services/events.services';
import { EventModelFullData } from '../core/interfaces/event.interface';
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

  eventsAll$ = this.eventsAllSubject.asObservable(); // Para calendario
  nonRepeatedEvents$ = this.nonRepeatedEventsSubject.asObservable(); // Para lista principal
  selectedEvent$ = this.selectedEventSubject.asObservable();

  currentFilter: number | null = null;

  setCurrentFilter(year: number | null): void {
    this.currentFilter = year;
  }

  loadEventsAllByYear(year: number): void {
    this.eventsService
      .getEventsByYear(year, 'all')
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        tap((events) => this.eventsAllSubject.next(events)),
        catchError((err) => this.generalService.handleHttpError(err))
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
        catchError((err) => this.generalService.handleHttpError(err))
      )
      .subscribe();
  }

  loadEventById(id: number): void {
    this.eventsService
      .getEventById(id)
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        tap((event) => this.selectedEventSubject.next(event)),
        catchError((err) => this.generalService.handleHttpError(err))
      )
      .subscribe();
  }

  loadEventsByPeriodicId(periodicId: number): Observable<EventModelFullData[]> {
    return this.eventsService.getEventsByPeriodicId(periodicId).pipe(
      takeUntilDestroyed(this.destroyRef),
      tap((events) => {
        this.eventsAllSubject.next(events);
        this.nonRepeatedEventsSubject.next(events);
      }),
      catchError((err) => this.generalService.handleHttpError(err))
    );
  }

  addEvent(event: FormData): Observable<FormData> {
    return this.eventsService.add(event).pipe(
      takeUntilDestroyed(this.destroyRef),
      tap(() => this.reloadCurrentFilter()),
      catchError((err) => this.generalService.handleHttpError(err))
    );
  }

  editEvent(itemId: number, event: FormData): Observable<FormData> {
    return this.eventsService.edit(itemId, event).pipe(
      takeUntilDestroyed(this.destroyRef),
      tap(() => this.reloadCurrentFilter()),
      catchError((err) => this.generalService.handleHttpError(err))
    );
  }

  deleteEvent(id: number): void {
    this.eventsService
      .delete(id)
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        tap(() => this.reloadCurrentFilter()),
        catchError((err) => this.generalService.handleHttpError(err))
      )
      .subscribe();
  }

  clearSelectedEvent(): void {
    this.selectedEventSubject.next(null);
  }

  applyFilterWord(keyword: string): void {
    const currentEvents = this.nonRepeatedEventsSubject.getValue();

    if (!keyword.trim() || !currentEvents) {
      this.nonRepeatedEventsSubject.next(currentEvents);
      return;
    }

    const search = keyword.trim().toLowerCase();
    const filtered = currentEvents.filter((event) =>
      event.title.toLowerCase().includes(search)
    );

    this.nonRepeatedEventsSubject.next(filtered);
  }

  private reloadCurrentFilter(): void {
    if (this.currentFilter !== null) {
      this.loadEventsAllByYear(this.currentFilter);
      this.loadNonRepeatedEventsByYear(this.currentFilter);
    }
  }
}
