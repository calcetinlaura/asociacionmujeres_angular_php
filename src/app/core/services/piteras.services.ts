import { Injectable } from '@angular/core';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { catchError } from 'rxjs/operators';
import { Observable, throwError } from 'rxjs';
import { environments } from 'src/environments/environments';
import { PiteraModel } from 'src/app/core/interfaces/pitera.interface';

@Injectable({
  providedIn: 'root',
})
export class PiterasService {
  private apiUrl: string = `${environments.api}/backend/piteras.php`;
  constructor(private http: HttpClient) {}

  getPiteras(): Observable<any> {
    return this.http.get(this.apiUrl).pipe(catchError(this.handleError));
  }

  getPiteraById(id: number): Observable<any> {
    return this.http
      .get(`${this.apiUrl}/${id}`)
      .pipe(catchError(this.handleError));
  }

  add(pitera: FormData): Observable<any> {
    return this.http
      .post(this.apiUrl, pitera)
      .pipe(catchError(this.handleError));
  }

  edit(id: number, pitera: FormData): Observable<any> {
    return this.http
      .post(this.apiUrl, pitera)
      .pipe(catchError(this.handleError));
  }

  delete(id: number): Observable<any> {
    return this.http
      .delete(this.apiUrl, { params: { id: id } })
      .pipe(catchError(this.handleError));
  }

  sortPiterasByYear(piteras: PiteraModel[]): PiteraModel[] {
    return piteras.sort((a, b) => b.year - a.year);
  }

  sortPiterasById(piteras: PiteraModel[]): PiteraModel[] {
    return piteras.sort((a, b) => b.id - a.id);
  }

  hasResults(piteras: PiteraModel[] | null): boolean {
    return !!piteras && piteras.length > 0;
  }

  countPiteras(piteras: PiteraModel[] | null): number {
    return piteras?.length ?? 0;
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
