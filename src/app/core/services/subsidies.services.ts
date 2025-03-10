import { Injectable } from '@angular/core';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { catchError } from 'rxjs/operators';
import { Observable, throwError } from 'rxjs';
import { environments } from 'src/environments/environments';

@Injectable({
  providedIn: 'root',
})
export class SubsidiesService {
  private apiUrl: string = `${environments.api}/backend/subsidies`;
  constructor(private http: HttpClient) {}

  public subsidiesMap = {
    GENERALITAT: 'Generalitat',
    DIPUTACION: 'Diputación',
    AYUNT_EQUIPAMIENTO: 'Ayunt. Equipamiento',
    AYUNT_ACTIVIDADES: 'Ayunt. Actividades',
    MINISTERIO: 'Ministerio',
  };

  getAll(): Observable<any> {
    return this.http.get(this.apiUrl).pipe(catchError(this.handleError));
  }
  getAllByType(type: string): Observable<any> {
    const urlWithParams = `${this.apiUrl}/type`;
    return this.http
      .get(urlWithParams, {
        params: { name: type },
      })
      .pipe(catchError(this.handleError));
  }
  getAllByYear(year: number): Observable<any> {
    const urlWithParams = `${this.apiUrl}/year`;
    return this.http
      .get(urlWithParams, {
        params: { year: year },
      })
      .pipe(catchError(this.handleError));
  }

  add(subsidy: any): Observable<any> {
    return this.http
      .post(`${this.apiUrl}/add`, subsidy)
      .pipe(catchError(this.handleError));
  }

  edit(id: number, subsidy: any): Observable<any> {
    return this.http
      .patch(`${this.apiUrl}/edit/${id}`, subsidy)
      .pipe(catchError(this.handleError));
  }

  delete(id: number): Observable<any> {
    return this.http
      .delete(`${this.apiUrl}/delete/${id}`)
      .pipe(catchError(this.handleError));
  }

  getById(id: number): Observable<any> {
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
