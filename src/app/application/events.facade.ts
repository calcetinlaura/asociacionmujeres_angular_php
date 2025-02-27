import { DestroyRef, inject, Injectable } from '@angular/core';
import { BehaviorSubject, catchError, Observable, tap, throwError } from 'rxjs';
import { EventsService } from '../core/services/events.services';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { EventModel } from '../core/interfaces/event.interface';
import { HttpErrorResponse } from '@angular/common/http';

@Injectable({
  providedIn: 'root',
})
export class EventsFacade {
  private destroyRef = inject(DestroyRef);
  private eventsService = inject(EventsService);
  private eventsSubject = new BehaviorSubject<EventModel[] | null>(null);
  private selectedEventSubject = new BehaviorSubject<EventModel | null>(null);

  events$ = this.eventsSubject.asObservable();
  selectedEvent$ = this.selectedEventSubject.asObservable();

  constructor() {}

  loadAllEvents(): void {
    this.eventsService
      .getEvents()
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        tap((events: EventModel[]) => this.eventsSubject.next(events)),
        catchError(this.handleError)
      )
      .subscribe();
  }

  loadEventById(id: number): void {
    this.eventsService
      .getEventById(id)
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        tap((event: EventModel) => this.selectedEventSubject.next(event)),
        catchError(this.handleError)
      )
      .subscribe();
  }

  addEvent(event: EventModel): Observable<EventModel> {
    return this.eventsService.add(event).pipe(
      tap(() => this.loadAllEvents()),
      catchError(this.handleError)
    );
  }

  editEvent(itemId: number, event: EventModel): void {
    this.eventsService
      .edit(itemId, event)
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        tap(() => this.loadAllEvents()),
        catchError(this.handleError)
      )
      .subscribe();
  }

  deleteEvent(id: number): void {
    this.eventsService
      .delete(id)
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        tap(() => this.loadAllEvents()),
        catchError(this.handleError)
      )
      .subscribe();
  }

  // Clear selected event
  clearSelectedEvent(): void {
    this.selectedEventSubject.next(null);
  }

  // Método para manejar errores
  handleError(error: HttpErrorResponse) {
    let errorMessage = '';

    if (error.error instanceof ErrorEvent) {
      // Error del lado del cliente o red
      errorMessage = `Error del cliente o red: ${error.error.message}`;
    } else {
      // El backend retornó un código de error no exitoso
      errorMessage = `Código de error del servidor: ${error.status}\nMensaje: ${error.message}`;
    }

    console.error(errorMessage); // Para depuración

    // Aquí podrías devolver un mensaje amigable para el usuario, o simplemente retornar el error
    return throwError(
      () =>
        new Error(
          'Hubo un problema con la solicitud, inténtelo de nuevo más tarde.'
        )
    );
  }
}
