import { inject, Injectable } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { BehaviorSubject, catchError, Observable, tap } from 'rxjs';
import { MovieModel } from 'src/app/core/interfaces/movie.interface';
import { MoviesService } from 'src/app/core/services/movies.services';
import { includesNormalized, toSearchKey } from '../shared/utils/text.utils';
import { LoadableFacade } from './loadable.facade';

@Injectable({ providedIn: 'root' })
export class MoviesFacade extends LoadableFacade {
  private readonly moviesService = inject(MoviesService);

  // State propio
  private readonly moviesSubject = new BehaviorSubject<MovieModel[] | null>(
    null
  );
  private readonly filteredMoviesSubject = new BehaviorSubject<
    MovieModel[] | null
  >(null);
  private readonly selectedMovieSubject =
    new BehaviorSubject<MovieModel | null>(null);

  // Streams públicos
  readonly movies$ = this.moviesSubject.asObservable();
  readonly filteredMovies$ = this.filteredMoviesSubject.asObservable();
  readonly selectedMovie$ = this.selectedMovieSubject.asObservable();

  private currentFilter: string | null = null;

  loadAllMovies(): void {
    this.setCurrentFilter(null);
    this.executeWithLoading(this.moviesService.getMovies(), (movies) =>
      this.updateMovieState(movies)
    );
  }

  loadMoviesByFilter(filter: string): void {
    this.setCurrentFilter(filter);
    this.loadMoviesByGender(filter);
  }

  loadMoviesByLatest(): void {
    this.executeWithLoading(this.moviesService.getMoviesByLatest(), (movies) =>
      this.updateMovieState(movies)
    );
  }

  // Conservamos el método del service getMoviesByGender(...)
  loadMoviesByGender(gender: string): void {
    this.executeWithLoading(
      this.moviesService.getMoviesByGender(gender),
      (movies) => this.updateMovieState(movies)
    );
  }

  loadMoviesByYear(year: number): void {
    this.executeWithLoading(
      this.moviesService.getMoviesByYear(year),
      (movies) => this.updateMovieState(movies)
    );
  }

  loadMovieById(id: number): void {
    this.executeWithLoading(this.moviesService.getMovieById(id), (movie) =>
      this.selectedMovieSubject.next(movie)
    );
  }

  addMovie(movie: FormData): Observable<FormData> {
    return this.wrapWithLoading(this.moviesService.add(movie)).pipe(
      takeUntilDestroyed(this.destroyRef),
      tap(() => this.reloadCurrentFilter()),
      catchError((err) => this.generalService.handleHttpError(err))
    );
  }

  editMovie(movie: FormData): Observable<FormData> {
    return this.wrapWithLoading(this.moviesService.edit(movie)).pipe(
      takeUntilDestroyed(this.destroyRef),
      tap(() => this.reloadCurrentFilter()),
      catchError((err) => this.generalService.handleHttpError(err))
    );
  }

  deleteMovie(id: number): void {
    this.executeWithLoading(this.moviesService.delete(id), () =>
      this.reloadCurrentFilter()
    );
  }

  clearSelectedMovie(): void {
    this.selectedMovieSubject.next(null);
  }

  applyFilterWord(keyword: string): void {
    const all = this.moviesSubject.getValue();

    if (!all) {
      this.filteredMoviesSubject.next(all);
      return;
    }

    if (!toSearchKey(keyword)) {
      this.filteredMoviesSubject.next(all);
      return;
    }

    const filtered = all.filter((m) =>
      [m.title, m.director].some((field) => includesNormalized(field, keyword))
    );

    this.filteredMoviesSubject.next(filtered);
  }

  // --------- privados
  setCurrentFilter(filter: string | null): void {
    this.currentFilter = filter;
  }

  private reloadCurrentFilter(): void {
    if (this.currentFilter === null) {
      this.loadAllMovies();
      return;
    }
    this.loadMoviesByFilter(this.currentFilter);
  }

  private updateMovieState(movies: MovieModel[]): void {
    this.moviesSubject.next(movies);
    this.filteredMoviesSubject.next(movies);
  }
}
