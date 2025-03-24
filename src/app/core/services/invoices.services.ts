import { Injectable } from '@angular/core';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { catchError } from 'rxjs/operators';
import { Observable, throwError } from 'rxjs';
import { environments } from 'src/environments/environments';

@Injectable({
  providedIn: 'root',
})
export class InvoicesService {
  private apiUrl: string = `${environments.api}/backend/invoices.php`;
  constructor(private http: HttpClient) {}

  getInvoices(): Observable<any> {
    return this.http.get(this.apiUrl).pipe(catchError(this.handleError));
  }

  getInvoicesBySubsidy(subsidy: string, year: number): Observable<any> {
    return this.http
      .get(this.apiUrl, {
        params: { subsidy: subsidy, subsidy_year: year },
      })
      .pipe(catchError(this.handleError));
  }

  getInvoicesByYear(year: number): Observable<any> {
    return this.http
      .get(this.apiUrl, {
        params: { year: year },
      })
      .pipe(catchError(this.handleError));
  }

  getInvoicesByCategroy(category: string): Observable<any> {
    return this.http
      .get(this.apiUrl, {
        params: { category: category },
      })
      .pipe(catchError(this.handleError));
  }

  getInvoiceById(id: number): Observable<any> {
    return this.http
      .get(`${this.apiUrl}/${id}`)
      .pipe(catchError(this.handleError));
  }

  add(invoice: FormData): Observable<any> {
    return this.http
      .post(this.apiUrl, invoice)
      .pipe(catchError(this.handleError));
  }

  edit(id: number, invoice: FormData): Observable<any> {
    return this.http
      .post(this.apiUrl, invoice)
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
