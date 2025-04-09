import { DestroyRef, inject, Injectable } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { BehaviorSubject, catchError, Observable, tap } from 'rxjs';
import { MovieModel } from 'src/app/core/interfaces/movie.interface';
import { MoviesService } from 'src/app/core/services/movies.services';
import { GeneralService } from '../shared/services/generalService.service';

@Injectable({
  providedIn: 'root',
})
export class MoviesFacade {
  private readonly destroyRef = inject(DestroyRef);
  private readonly moviesService = inject(MoviesService);
  private readonly generalService = inject(GeneralService);
  private readonly moviesSubject = new BehaviorSubject<MovieModel[] | null>(
    null
  );
  private readonly filteredMoviesSubject = new BehaviorSubject<
    MovieModel[] | null
  >(null);
  private readonly selectedMovieSubject =
    new BehaviorSubject<MovieModel | null>(null);

  movies$ = this.moviesSubject.asObservable();
  selectedMovie$ = this.selectedMovieSubject.asObservable();
  filteredMovies$ = this.filteredMoviesSubject.asObservable();

  currentFilter: string = 'TODOS';

  constructor() {}

  setCurrentFilter(filter: string): void {
    this.currentFilter = filter;
    this.loadMoviesByFilter(filter);
  }

  loadMoviesByFilter(filter: string): void {
    const loaders: Record<string, () => void> = {
      TODOS: () => this.loadAllMovies(),
      NOVEDADES: () => this.loadMoviesByLatest(),
    };

    (loaders[filter] || (() => this.loadMoviesByGender(filter)))();
  }

  private reloadCurrentFilter(): void {
    this.loadMoviesByFilter(this.currentFilter);
  }

  loadAllMovies(): void {
    this.moviesService
      .getMovies()
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        tap((movies: MovieModel[]) => this.updateMovieState(movies)),
        catchError((err) => this.generalService.handleHttpError(err))
      )
      .subscribe();
  }

  loadMoviesByLatest(): void {
    this.moviesService
      .getMoviesByLatest()
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        tap((movies: MovieModel[]) => this.updateMovieState(movies)),
        catchError((err) => this.generalService.handleHttpError(err))
      )
      .subscribe();
  }

  loadMoviesByGender(gender: string): void {
    this.moviesService
      .getMoviesByGender(gender)
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        tap((movies: MovieModel[]) => this.updateMovieState(movies)),
        catchError((err) => this.generalService.handleHttpError(err))
      )
      .subscribe();
  }

  loadMoviesByYear(year: number): void {
    this.moviesService
      .getMoviesByYear(year)
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        tap((movies: MovieModel[]) => this.updateMovieState(movies)),
        catchError((err) => this.generalService.handleHttpError(err))
      )
      .subscribe();
  }

  loadMovieById(id: number): void {
    this.moviesService
      .getMovieById(id)
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        tap((movie: MovieModel) => this.selectedMovieSubject.next(movie)),
        catchError((err) => this.generalService.handleHttpError(err))
      )
      .subscribe();
  }

  addMovie(movie: FormData): Observable<FormData> {
    return this.moviesService.add(movie).pipe(
      takeUntilDestroyed(this.destroyRef),
      tap(() => this.reloadCurrentFilter()),
      catchError((err) => this.generalService.handleHttpError(err))
    );
  }

  editMovie(itemId: number, movie: FormData): Observable<FormData> {
    return this.moviesService.edit(itemId, movie).pipe(
      takeUntilDestroyed(this.destroyRef),
      tap(() => this.reloadCurrentFilter()),
      catchError((err) => this.generalService.handleHttpError(err))
    );
  }

  deleteMovie(id: number): void {
    this.moviesService
      .delete(id)
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        tap(() => this.reloadCurrentFilter()),
        catchError((err) => this.generalService.handleHttpError(err))
      )
      .subscribe();
  }

  clearSelectedMovie(): void {
    this.selectedMovieSubject.next(null);
  }

  applyFilterWord(keyword: string): void {
    const allMovies = this.moviesSubject.getValue();

    if (!keyword.trim() || !allMovies) {
      this.filteredMoviesSubject.next(allMovies);
      return;
    }
    const search = keyword.trim().toLowerCase();
    const filteredMovies = allMovies.filter(
      (movie) =>
        movie.title.toLowerCase().includes(search) ||
        (movie.director && movie.director.toLowerCase().includes(search))
    );

    this.filteredMoviesSubject.next(filteredMovies);
  }

  private updateMovieState(movies: MovieModel[]): void {
    this.moviesSubject.next(movies);
    this.filteredMoviesSubject.next(movies); // Actualiza también las peliculas filtradas
  }
}
