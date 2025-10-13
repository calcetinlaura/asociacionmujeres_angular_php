import { inject, Injectable } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { BehaviorSubject, catchError, finalize, Observable, tap } from 'rxjs';
import { MovieModel } from 'src/app/core/interfaces/movie.interface';
import { MoviesService } from 'src/app/core/services/movies.services';
import { includesNormalized, toSearchKey } from '../shared/utils/text.utils';
import { LoadableFacade } from './loadable.facade';

@Injectable({ providedIn: 'root' })
export class MoviesFacade extends LoadableFacade {
  private readonly moviesService = inject(MoviesService);

  // ─────────────────────────────────────────────
  // State
  // ─────────────────────────────────────────────
  private readonly moviesSubject = new BehaviorSubject<MovieModel[] | null>(
    null
  );
  private readonly filteredMoviesSubject = new BehaviorSubject<
    MovieModel[] | null
  >(null);
  private readonly selectedMovieSubject =
    new BehaviorSubject<MovieModel | null>(null);

  // NEW: loaders separados
  private readonly listLoadingSubject = new BehaviorSubject<boolean>(false);
  private readonly itemLoadingSubject = new BehaviorSubject<boolean>(false);

  // ─────────────────────────────────────────────
  // Public streams
  // ─────────────────────────────────────────────
  readonly movies$ = this.moviesSubject.asObservable();
  readonly filteredMovies$ = this.filteredMoviesSubject.asObservable();
  readonly selectedMovie$ = this.selectedMovieSubject.asObservable();

  // NEW: usa estos en la UI
  readonly isLoadingList$ = this.listLoadingSubject.asObservable();
  readonly isLoadingItem$ = this.itemLoadingSubject.asObservable();

  private currentFilter: string | null = null;

  // ─────────────────────────────────────────────
  // Cargas de LISTA  → isLoadingList$
  // ─────────────────────────────────────────────
  loadAllMovies(): void {
    this.setCurrentFilter(null);
    this.listLoadingSubject.next(true);
    this.moviesService
      .getMovies()
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        catchError((err) => this.generalService.handleHttpError(err)),
        finalize(() => this.listLoadingSubject.next(false))
      )
      .subscribe((movies) => this.updateMovieState(movies));
  }

  loadMoviesByFilter(filter: string): void {
    this.setCurrentFilter(filter);
    this.loadMoviesByGender(filter);
  }

  loadMoviesByLatest(): void {
    this.listLoadingSubject.next(true);
    this.moviesService
      .getMoviesByLatest()
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        catchError((err) => this.generalService.handleHttpError(err)),
        finalize(() => this.listLoadingSubject.next(false))
      )
      .subscribe((movies) => this.updateMovieState(movies));
  }

  loadMoviesByGender(gender: string): void {
    this.listLoadingSubject.next(true);
    this.moviesService
      .getMoviesByGender(gender)
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        catchError((err) => this.generalService.handleHttpError(err)),
        finalize(() => this.listLoadingSubject.next(false))
      )
      .subscribe((movies) => this.updateMovieState(movies));
  }

  loadMoviesByYear(year: number): void {
    this.listLoadingSubject.next(true);
    this.moviesService
      .getMoviesByYear(year)
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        catchError((err) => this.generalService.handleHttpError(err)),
        finalize(() => this.listLoadingSubject.next(false))
      )
      .subscribe((movies) => this.updateMovieState(movies));
  }

  // ─────────────────────────────────────────────
  // Cargas/acciones de ITEM  → isLoadingItem$
  // ─────────────────────────────────────────────
  loadMovieById(id: number): void {
    this.itemLoadingSubject.next(true);
    this.moviesService
      .getMovieById(id)
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        catchError((err) => this.generalService.handleHttpError(err)),
        finalize(() => this.itemLoadingSubject.next(false))
      )
      .subscribe((movie) => this.selectedMovieSubject.next(movie));
  }

  addMovie(movie: FormData): Observable<FormData> {
    this.itemLoadingSubject.next(true);
    return this.moviesService.add(movie).pipe(
      takeUntilDestroyed(this.destroyRef),
      tap(() => this.reloadCurrentFilter()),
      catchError((err) => this.generalService.handleHttpError(err)),
      finalize(() => this.itemLoadingSubject.next(false))
    );
  }

  editMovie(movie: FormData): Observable<FormData> {
    this.itemLoadingSubject.next(true);
    return this.moviesService.edit(movie).pipe(
      takeUntilDestroyed(this.destroyRef),
      tap(() => this.reloadCurrentFilter()),
      catchError((err) => this.generalService.handleHttpError(err)),
      finalize(() => this.itemLoadingSubject.next(false))
    );
  }

  deleteMovie(id: number): void {
    this.itemLoadingSubject.next(true);
    this.moviesService
      .delete(id)
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        catchError((err) => this.generalService.handleHttpError(err)),
        finalize(() => this.itemLoadingSubject.next(false))
      )
      .subscribe(() => this.reloadCurrentFilter());
  }

  // ─────────────────────────────────────────────
  // Utilidades
  // ─────────────────────────────────────────────
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
