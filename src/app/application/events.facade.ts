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
import { PlaceModel } from 'src/app/core/interfaces/place.interface';
import { EventsService } from 'src/app/core/services/events.services';
import { PlacesService } from 'src/app/core/services/places.services';
import {
  EventModel,
  EventModelFullData,
} from '../core/interfaces/event.interface';
import { MacroeventModel } from '../core/interfaces/macroevent.interface';
import { MacroeventsService } from '../core/services/macroevents.services';

@Injectable({
  providedIn: 'root',
})
export class EventsFacade {
  private readonly destroyRef = inject(DestroyRef);
  private readonly eventsService = inject(EventsService);
  private readonly macroeventsService = inject(MacroeventsService);
  private readonly placesService = inject(PlacesService);
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
        switchMap((events) => this.enrichWithFullData(events)),
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
        switchMap((events) => this.enrichWithFullData(events)),
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

    this.enrichWithFullData(filteredEvents).subscribe(); // enriquecido
  }

  private enrichWithFullData(
    events: EventModel[]
  ): Observable<EventModelFullData[]> {
    if (!events || events.length === 0) {
      this.updateEventState([]);
      return of([]);
    }

    return this.placesService.getAllPlacesWithSalas().pipe(
      switchMap((places: PlaceModel[]) =>
        this.macroeventsService.getMacroevents().pipe(
          map((macroevents: MacroeventModel[]) => {
            const enriched = events.map((event) => {
              let placeData: PlaceModel | undefined;
              let salaData: any = undefined;
              let macroeventData: MacroeventModel | undefined = undefined;

              // Asignar placeData y salaData como ya hacías
              if (event.sala_id) {
                for (const place of places) {
                  const sala = place.salas?.find(
                    (s) => s.sala_id === event.sala_id
                  );
                  if (sala) {
                    placeData = place;
                    salaData = sala;
                    break;
                  }
                }
              }
              if (!placeData && event.place_id) {
                placeData = places.find((place) => place.id === event.place_id);
              }

              // Asignar macroevento si existe
              if (event.macroevent_id) {
                macroeventData = macroevents.find(
                  (m) => m.id === event.macroevent_id
                );
              }

              return {
                ...event,
                placeData,
                salaData,
                macroeventData,
              };
            });

            this.updateEventState(enriched);
            return enriched;
          })
        )
      )
    );
  }

  private updateEventState(events: EventModel[]): void {
    this.eventsSubject.next(events);
    this.filteredEventsSubject.next(events);
  }

  private handleError(error: any): Observable<never> {
    let errorMessage = 'Ha ocurrido un error desconocido.';

    if (error instanceof HttpErrorResponse) {
      if (error.error instanceof ProgressEvent) {
        errorMessage = 'No se pudo conectar con el servidor.';
      } else if (typeof error.error === 'string') {
        errorMessage = error.error;
      } else if (error.error?.message) {
        errorMessage = error.error.message;
      } else {
        errorMessage = `Error ${error.status}: ${error.statusText}`;
      }
    }

    console.error('Error capturado por handleError:', error);
    return throwError(() => new Error(errorMessage));
  }
}
