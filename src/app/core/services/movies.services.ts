import { Injectable } from '@angular/core';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { catchError } from 'rxjs/operators';
import { Observable, throwError } from 'rxjs';
import { environments } from 'src/environments/environments';
import { MovieModel } from 'src/app/core/interfaces/movie.interface';

@Injectable({
  providedIn: 'root',
})
export class MoviesService {
  private apiUrl: string = `${environments.api}/backend/movies.php`;
  constructor(private http: HttpClient) {}

  getMovies(): Observable<any> {
    return this.http.get(this.apiUrl).pipe(catchError(this.handleError));
  }

  getMoviesByGender(gender: string): Observable<any> {
    return this.http
      .get(this.apiUrl, { params: { gender: gender } })
      .pipe(catchError(this.handleError));
  }

  getMoviesByYear(year: number): Observable<any> {
    return this.http
      .get(this.apiUrl, { params: { year: year } })
      .pipe(catchError(this.handleError));
  }

  getMoviesByLatest(): Observable<any> {
    return this.http
      .get(this.apiUrl, { params: { latest: true } })
      .pipe(catchError(this.handleError));
  }

  getMovieById(id: number): Observable<any> {
    return this.http
      .get(`${this.apiUrl}/${id}`)
      .pipe(catchError(this.handleError));
  }

  add(movie: FormData): Observable<any> {
    return this.http
      .post(this.apiUrl, movie)
      .pipe(catchError(this.handleError));
  }

  edit(id: number, movie: FormData): Observable<any> {
    return this.http
      .post(this.apiUrl, movie)
      .pipe(catchError(this.handleError));
  }

  delete(id: number): Observable<any> {
    return this.http
      .delete(this.apiUrl, { params: { id: id } })
      .pipe(catchError(this.handleError));
  }

  sortMoviesByTitle(movies: MovieModel[]): MovieModel[] {
    return movies.sort((a, b) =>
      a.title.toLowerCase().localeCompare(b.title.toLowerCase())
    );
  }

  sortMoviesById(movies: MovieModel[]): MovieModel[] {
    return movies.sort((a, b) => b.id - a.id);
  }

  hasResults(movies: MovieModel[] | null): boolean {
    return !!movies && movies.length > 0;
  }

  countMovies(movies: MovieModel[] | null): number {
    return movies?.length ?? 0;
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
