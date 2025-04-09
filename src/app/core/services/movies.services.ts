import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { MovieModel } from 'src/app/core/interfaces/movie.interface';
import { GeneralService } from 'src/app/shared/services/generalService.service';
import { environments } from 'src/environments/environments';

@Injectable({
  providedIn: 'root',
})
export class MoviesService {
  private readonly generalService = inject(GeneralService);
  private apiUrl: string = `${environments.api}/backend/movies.php`;
  constructor(private http: HttpClient) {}

  getMovies(): Observable<any> {
    return this.http
      .get(this.apiUrl)
      .pipe(catchError((err) => this.generalService.handleHttpError(err)));
  }

  getMoviesByGender(gender: string): Observable<any> {
    return this.http
      .get(this.apiUrl, { params: { gender: gender } })
      .pipe(catchError((err) => this.generalService.handleHttpError(err)));
  }

  getMoviesByYear(year: number): Observable<any> {
    return this.http
      .get(this.apiUrl, { params: { year: year } })
      .pipe(catchError((err) => this.generalService.handleHttpError(err)));
  }

  getMoviesByLatest(): Observable<any> {
    return this.http
      .get(this.apiUrl, { params: { latest: true } })
      .pipe(catchError((err) => this.generalService.handleHttpError(err)));
  }

  getMovieById(id: number): Observable<any> {
    return this.http
      .get(`${this.apiUrl}/${id}`)
      .pipe(catchError((err) => this.generalService.handleHttpError(err)));
  }

  add(movie: FormData): Observable<any> {
    return this.http
      .post(this.apiUrl, movie)
      .pipe(catchError((err) => this.generalService.handleHttpError(err)));
  }

  edit(id: number, movie: FormData): Observable<any> {
    return this.http
      .post(this.apiUrl, movie)
      .pipe(catchError((err) => this.generalService.handleHttpError(err)));
  }

  delete(id: number): Observable<any> {
    return this.http
      .delete(this.apiUrl, { params: { id: id } })
      .pipe(catchError((err) => this.generalService.handleHttpError(err)));
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
}
