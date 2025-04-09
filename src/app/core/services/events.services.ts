import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable, throwError } from 'rxjs';
import { catchError } from 'rxjs/operators';
import {
  EventModel,
  EventModelFullData,
} from 'src/app/core/interfaces/event.interface';
import { environments } from 'src/environments/environments';

@Injectable({
  providedIn: 'root',
})
export class EventsService {
  private apiUrl: string = `${environments.api}/backend/events.php`;
  constructor(private http: HttpClient) {}

  getEvents(): Observable<any> {
    return this.http.get(this.apiUrl).pipe(catchError(this.handleError));
  }
  getEventsByYear(year: number): Observable<any> {
    return this.http
      .get(this.apiUrl, { params: { year: year } })
      .pipe(catchError(this.handleError));
  }
  getEventsByMacroevent(macroeventId: number): Observable<any> {
    return this.http
      .get(this.apiUrl, {
        params: { macroevent_id: macroeventId },
      })
      .pipe(catchError(this.handleError));
  }
  getEventById(id: number): Observable<any> {
    return this.http
      .get(`${this.apiUrl}/${id}`)
      .pipe(catchError(this.handleError));
  }

  add(event: FormData): Observable<any> {
    return this.http
      .post(this.apiUrl, event)
      .pipe(catchError(this.handleError));
  }

  edit(id: number, event: FormData): Observable<any> {
    return this.http
      .post(this.apiUrl, event)
      .pipe(catchError(this.handleError));
  }

  delete(id: number): Observable<any> {
    return this.http
      .delete(this.apiUrl, { params: { id: id } })
      .pipe(catchError(this.handleError));
  }

  sortEventsByTitle(events: EventModelFullData[]): EventModel[] {
    return events.sort((a, b) =>
      a.title.toLowerCase().localeCompare(b.title.toLowerCase())
    );
  }

  sortEventsByDate(events: EventModel[]): EventModel[] {
    return events.sort(
      (a, b) => new Date(b.start).getTime() - new Date(a.start).getTime()
    );
  }

  sortEventsById(events: EventModelFullData[]): EventModel[] {
    return events.sort((a, b) => b.id - a.id);
  }

  hasResults(events: EventModelFullData[] | null): boolean {
    return !!events && events.length > 0;
  }

  countEvents(events: EventModelFullData[] | null): number {
    return events?.length ?? 0;
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
