import { Injectable } from '@angular/core';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { catchError } from 'rxjs/operators';
import { Observable, throwError } from 'rxjs';
import { environments } from 'src/environments/environments';

@Injectable({
  providedIn: 'root',
})
export class EventsService {
  private apiUrl: string = `${environments.api}/api/events.php`;
  constructor(private http: HttpClient) {}

  getEvents(): Observable<any> {
    return this.http.get(this.apiUrl).pipe(catchError(this.handleError));
  }
  getEventsByYear(year: number): Observable<any> {
    const urlWithParams = `${this.apiUrl}/year`;
    return this.http
      .get(urlWithParams, {
        params: { year: year },
      })
      .pipe(catchError(this.handleError));
  }

  add(event: any): Observable<any> {
    return this.http
      .post(`${this.apiUrl}/add`, event)
      .pipe(catchError(this.handleError));
  }

  edit(id: number, event: any): Observable<any> {
    return this.http
      .patch(`${this.apiUrl}/edit/${id}`, event)
      .pipe(catchError(this.handleError));
  }

  delete(id: number): Observable<any> {
    return this.http
      .delete(`${this.apiUrl}/delete/${id}`)
      .pipe(catchError(this.handleError));
  }

  getEventById(id: number): Observable<any> {
    return this.http
      .get(`${this.apiUrl}/${id}`)
      .pipe(catchError(this.handleError));
  }

  // Método para manejar errores
  private handleError(error: HttpErrorResponse) {
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
