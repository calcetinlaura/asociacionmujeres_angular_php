import { HttpErrorResponse } from '@angular/common/http';
import { DestroyRef, inject, Injectable } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import {
  BehaviorSubject,
  catchError,
  map,
  Observable,
  of,
  switchMap,
  tap,
  throwError,
} from 'rxjs';
import { EventWithPlaceModel } from 'src/app/core/interfaces/event.interface';
import { PlaceModel } from 'src/app/core/interfaces/place.interface';
import { EventsService } from 'src/app/core/services/events.services';
import { PlacesService } from 'src/app/core/services/places.services';

@Injectable({
  providedIn: 'root',
})
export class EventsFacade {
  private readonly destroyRef = inject(DestroyRef);
  private readonly eventsService = inject(EventsService);
  private readonly placesService = inject(PlacesService);
  private readonly eventsSubject = new BehaviorSubject<
    EventWithPlaceModel[] | null
  >(null);
  private readonly filteredEventsSubject = new BehaviorSubject<
    EventWithPlaceModel[] | null
  >(null);
  private readonly selectedEventSubject =
    new BehaviorSubject<EventWithPlaceModel | null>(null);

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
        switchMap((events) => this.enrichWithPlaceData(events)),
        catchError(this.handleError)
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
        switchMap((events) => this.enrichWithPlaceData(events)),
        catchError(this.handleError)
      )
      .subscribe();
  }

  loadEventById(id: number): void {
    this.eventsService
      .getEventById(id)
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        tap((event) => this.selectedEventSubject.next(event)),
        catchError(this.handleError)
      )
      .subscribe();
  }

  editEvent(itemId: number, event: FormData): Observable<FormData> {
    return this.eventsService.edit(itemId, event).pipe(
      takeUntilDestroyed(this.destroyRef),
      tap(() => this.reloadCurrentFilteredYear()),
      catchError(this.handleError)
    );
  }

  addEvent(event: FormData): Observable<FormData> {
    return this.eventsService.add(event).pipe(
      takeUntilDestroyed(this.destroyRef),
      tap(() => this.reloadCurrentFilteredYear()),
      catchError(this.handleError)
    );
  }

  deleteEvent(id: number): void {
    this.eventsService
      .delete(id)
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        tap(() => this.reloadCurrentFilteredYear()),
        catchError(this.handleError)
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

    this.enrichWithPlaceData(filteredEvents).subscribe(); // enriquecido
  }

  private enrichWithPlaceData(
    events: EventWithPlaceModel[]
  ): Observable<EventWithPlaceModel[]> {
    if (!events || events.length === 0) {
      this.updateEventState([]);
      return of([]);
    }

    return this.placesService.getPlaces().pipe(
      map((places: PlaceModel[]) => {
        const enriched = events.map((event) => ({
          ...event,
          placeData:
            places.find((p) => p.id === Number(event.place)) ?? undefined,
        }));

        this.updateEventState(enriched); // ✅ actualiza estado
        return enriched;
      })
    );
  }

  private updateEventState(events: EventWithPlaceModel[]): void {
    this.eventsSubject.next(events);
    this.filteredEventsSubject.next(events);
  }

  private handleError(error: HttpErrorResponse) {
    const errorMessage =
      error.error instanceof ErrorEvent
        ? `Error del cliente o red: ${error.error.message}`
        : `Error del servidor: ${error.status} - ${error.message}`;

    console.error('EventsFacade error:', errorMessage);
    return throwError(() => new Error('Error al procesar la solicitud.'));
  }
}
