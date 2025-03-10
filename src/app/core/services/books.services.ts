import { Injectable } from '@angular/core';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { catchError } from 'rxjs/operators';
import { Observable, throwError } from 'rxjs';
import { environments } from 'src/environments/environments';

@Injectable({
  providedIn: 'root',
})
export class BooksService {
  private apiUrl: string = `${environments.api}/backend/books.php`;
  constructor(private http: HttpClient) {}

  getBooks(): Observable<any> {
    return this.http.get(this.apiUrl).pipe(catchError(this.handleError));
  }

  getBooksByGender(gender: string): Observable<any> {
    return this.http
      .get(this.apiUrl, { params: { gender: gender } })
      .pipe(catchError(this.handleError));
  }

  getBooksByYear(year: number): Observable<any> {
    return this.http
      .get(this.apiUrl, { params: { year: year } })
      .pipe(catchError(this.handleError));
  }

  getBooksByLatest(): Observable<any> {
    return this.http
      .get(this.apiUrl, { params: { latest: true } })
      .pipe(catchError(this.handleError));
  }

  getBookById(id: number): Observable<any> {
    return this.http
      .get(`${this.apiUrl}/${id}`)
      .pipe(catchError(this.handleError));
  }

  add(book: FormData): Observable<any> {
    return this.http.post(this.apiUrl, book).pipe(catchError(this.handleError));
  }

  edit(id: number, book: FormData): Observable<any> {
    return this.http.post(this.apiUrl, book).pipe(catchError(this.handleError));
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
