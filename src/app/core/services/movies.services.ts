import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { GeneralService } from 'src/app/core/services/generalService.service';
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

  edit(movie: FormData): Observable<any> {
    return this.http
      .post(this.apiUrl, movie)
      .pipe(catchError((err) => this.generalService.handleHttpError(err)));
  }

  delete(id: number): Observable<any> {
    return this.generalService.deleteOverride<any>(this.apiUrl, { id });
  }
}
