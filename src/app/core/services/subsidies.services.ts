import { Injectable } from '@angular/core';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { catchError } from 'rxjs/operators';
import { Observable, throwError } from 'rxjs';
import { environments } from 'src/environments/environments';

@Injectable({
  providedIn: 'root',
})
export class SubsidiesService {
  private apiUrl: string = `${environments.api}/backend/subsidies.php`;
  constructor(private http: HttpClient) {}

  public subsidiesMap = {
    GENERALITAT: 'Generalitat',
    DIPUTACION: 'Diputación',
    AYUNT_EQUIPAMIENTO: 'Ayunt. Equipamiento',
    AYUNT_ACTIVIDADES: 'Ayunt. Actividades',
    MINISTERIO: 'Ministerio',
  };

  getSubisidies(): Observable<any> {
    return this.http.get(this.apiUrl).pipe(catchError(this.handleError));
  }

  getSubsidiesByType(type: string): Observable<any> {
    return this.http
      .get(this.apiUrl, {
        params: { name: type },
      })
      .pipe(catchError(this.handleError));
  }

  getSubsidiesByYear(year: number): Observable<any> {
    return this.http
      .get(this.apiUrl, {
        params: { year: year },
      })
      .pipe(catchError(this.handleError));
  }

  getSubsidiesByLatest(): Observable<any> {
    return this.http
      .get(this.apiUrl, { params: { latest: true } })
      .pipe(catchError(this.handleError));
  }

  getSubsidieById(id: number): Observable<any> {
    return this.http
      .get(`${this.apiUrl}/${id}`)
      .pipe(catchError(this.handleError));
  }

  add(subsidy: any): Observable<any> {
    return this.http
      .post(this.apiUrl, subsidy)
      .pipe(catchError(this.handleError));
  }

  edit(id: number, subsidy: any): Observable<any> {
    return this.http
      .post(this.apiUrl, subsidy)
      .pipe(catchError(this.handleError));
  }

  delete(id: number): Observable<any> {
    return this.http
      .delete(this.apiUrl, { params: { id: id } })
      .pipe(catchError(this.handleError));
  }

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
