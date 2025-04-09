import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable, throwError } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { environments } from 'src/environments/environments';
import { MacroeventModel } from '../interfaces/macroevent.interface';

@Injectable({
  providedIn: 'root',
})
export class MacroeventsService {
  private apiUrl: string = `${environments.api}/backend/macroevents.php`;
  constructor(private http: HttpClient) {}

  getMacroevents(): Observable<any> {
    return this.http.get(this.apiUrl).pipe(catchError(this.handleError));
  }
  getMacroeventsByYear(year: number): Observable<any> {
    return this.http
      .get(this.apiUrl, { params: { year: year } })
      .pipe(catchError(this.handleError));
  }

  getMacroeventById(id: number): Observable<any> {
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

  sortMacroeventsByTitle(macroevents: MacroeventModel[]): MacroeventModel[] {
    return macroevents.sort((a, b) =>
      a.title.toLowerCase().localeCompare(b.title.toLowerCase())
    );
  }

  sortMacroeventsByDate(macroevents: MacroeventModel[]): MacroeventModel[] {
    return macroevents.sort(
      (a, b) => new Date(b.start).getTime() - new Date(a.start).getTime()
    );
  }

  sortMacroeventsById(macroevents: MacroeventModel[]): MacroeventModel[] {
    return macroevents.sort((a, b) => b.id - a.id);
  }

  hasResults(macroevents: MacroeventModel[] | null): boolean {
    return !!macroevents && macroevents.length > 0;
  }

  countMacroevents(macroevents: MacroeventModel[] | null): number {
    return macroevents?.length ?? 0;
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
