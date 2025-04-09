import { DestroyRef, inject, Injectable } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { BehaviorSubject, catchError, Observable, tap } from 'rxjs';
import { EventsService } from 'src/app/core/services/events.services';
import {
  EventModel,
  EventModelFullData,
} from '../core/interfaces/event.interface';
import { GeneralService } from '../shared/services/generalService.service';

@Injectable({
  providedIn: 'root',
})
export class EventsFacade {
  private readonly destroyRef = inject(DestroyRef);
  private readonly eventsService = inject(EventsService);
  private readonly generalService = inject(GeneralService);
  private readonly eventsSubject = new BehaviorSubject<
    EventModelFullData[] | null
  >(null);
  private readonly filteredEventsSubject = new BehaviorSubject<
    EventModelFullData[] | null
  >(null);
  private readonly selectedEventSubject =
    new BehaviorSubject<EventModelFullData | null>(null);

  events$ = this.eventsSubject.asObservable();
  filteredEvents$ = this.filteredEventsSubject.asObservable();
  selectedEvent$ = this.selectedEventSubject.asObservable();
  currentYear: number | null = null;
  currentFilter: number | null = null;

  constructor() {}

  setCurrentFilter(year: number | null): void {
    this.currentFilter = year;
  }

  private reloadCurrentFilteredYear(): void {
    if (this.currentFilter !== null) {
      this.loadEventsByYear(this.currentFilter);
    } else {
      this.loadAllEvents();
    }
  }

  loadAllEvents(): void {
    this.eventsService
      .getEvents()
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        tap((events) => this.updateEventState(events)),
        catchError((err) => this.generalService.handleHttpError(err))
      )
      .subscribe();
  }

  setCurrentYear(year: number): void {
    this.currentYear = year;
  }

  loadEventsByYear(year: number): void {
    this.setCurrentFilter(year);

    this.eventsService
      .getEventsByYear(year)
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        tap((events) => this.updateEventState(events)),
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

  editEvent(itemId: number, event: FormData): Observable<FormData> {
    return this.eventsService.edit(itemId, event).pipe(
      takeUntilDestroyed(this.destroyRef),
      tap(() => this.reloadCurrentFilteredYear()),
      catchError((err) => this.generalService.handleHttpError(err))
    );
  }

  addEvent(event: FormData): Observable<FormData> {
    return this.eventsService.add(event).pipe(
      takeUntilDestroyed(this.destroyRef),
      tap(() => this.reloadCurrentFilteredYear()),
      catchError((err) => this.generalService.handleHttpError(err))
    );
  }

  deleteEvent(id: number): void {
    this.eventsService
      .delete(id)
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        tap(() => this.reloadCurrentFilteredYear()),
        catchError((err) => this.generalService.handleHttpError(err))
      )
      .subscribe();
  }

  clearSelectedEvent(): void {
    this.selectedEventSubject.next(null);
  }

  applyFilterWord(keyword: string): void {
    const allEvents = this.eventsSubject.getValue();

    if (!keyword.trim() || !allEvents) {
      this.filteredEventsSubject.next(allEvents);
      return;
    }
    const search = keyword.trim().toLowerCase();

    const filteredEvents = allEvents.filter((event) =>
      event.title.toLowerCase().includes(search)
    );
    this.updateEventState(filteredEvents);
  }

  private updateEventState(events: EventModel[]): void {
    this.eventsSubject.next(events);
    this.filteredEventsSubject.next(events);
  }
}
