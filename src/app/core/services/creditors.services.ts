import { Injectable } from '@angular/core';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { catchError } from 'rxjs/operators';
import { Observable, throwError } from 'rxjs';
import { environments } from 'src/environments/environments';
import { CreditorModel } from '../interfaces/creditor.interface';

@Injectable({
  providedIn: 'root',
})
export class CreditorsService {
  private apiUrl: string = `${environments.api}/api/creditors.php`;
  constructor(private http: HttpClient) {}

  getCreditors(): Observable<any> {
    return this.http.get(this.apiUrl).pipe(catchError(this.handleError));
  }

  getCreditorById(id: number): Observable<any> {
    return (
      this.http
        // .get(`${this.apiUrl}/${id}`)
        .get(this.apiUrl, { params: { id: id } })
        .pipe(catchError(this.handleError))
    );
  }

  add(creditor: CreditorModel): Observable<any> {
    return this.http
      .post(this.apiUrl, creditor)
      .pipe(catchError(this.handleError));
  }

  edit(id: number, creditor: CreditorModel): Observable<any> {
    return this.http
      .patch(`${this.apiUrl}/${id}`, creditor)
      .pipe(catchError(this.handleError));
  }

  delete(id: number): Observable<any> {
    return this.http
      .delete(`${this.apiUrl}?id=${id}`) // 🔹 Ahora el id se pasa como parámetro en la URL
      .pipe(catchError(this.handleError));
  }

  //Autocomplete de factura
  getSuggestions(query: string): Observable<CreditorModel[]> {
    return this.http
      .get<CreditorModel[]>(`${this.apiUrl}?q=${query}&_limit=6`)
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
