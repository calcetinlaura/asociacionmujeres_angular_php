import { inject, Injectable } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { BehaviorSubject, EMPTY, Observable } from 'rxjs';
import { catchError, finalize, tap } from 'rxjs/operators';
import { MovieModel } from 'src/app/core/interfaces/movie.interface';
import { MoviesService } from 'src/app/core/services/movies.services';
import {
  count,
  filterByKeyword,
  hasResults,
} from '../shared/utils/facade.utils';
import { LoadableFacade } from './loadable.facade';

@Injectable({ providedIn: 'root' })
export class MoviesFacade extends LoadableFacade {
  private readonly moviesService = inject(MoviesService);

  // ───────── STATE ─────────
  private readonly moviesSubject = new BehaviorSubject<MovieModel[] | null>(
    null
  );
  private readonly filteredMoviesSubject = new BehaviorSubject<
    MovieModel[] | null
  >(null);
  private readonly selectedMovieSubject =
    new BehaviorSubject<MovieModel | null>(null);

  private readonly listLoadingSubject = new BehaviorSubject<boolean>(false);
  private readonly itemLoadingSubject = new BehaviorSubject<boolean>(false);

  // ───────── PUBLIC STREAMS ─────────
  readonly movies$ = this.moviesSubject.asObservable();
  readonly filteredMovies$ = this.filteredMoviesSubject.asObservable();
  readonly selectedMovie$ = this.selectedMovieSubject.asObservable();
  readonly isLoadingList$ = this.listLoadingSubject.asObservable();
  readonly isLoadingItem$ = this.itemLoadingSubject.asObservable();

  private currentFilter: string | null = null;

  // ───────── LISTAS → isLoadingList$ ─────────
  loadAllMovies(): void {
    this.setCurrentFilter(null);
    this.listLoadingSubject.next(true);

    this.moviesService
      .getMovies()
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        tap((movies) => this.updateMovieState(movies)),
        catchError((err) => {
          this.generalService.handleHttpError(err);
          return EMPTY;
        }),
        finalize(() => this.listLoadingSubject.next(false))
      )
      .subscribe();
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
        tap((movies) => this.updateMovieState(movies)),
        catchError((err) => {
          this.generalService.handleHttpError(err);
          return EMPTY;
        }),
        finalize(() => this.listLoadingSubject.next(false))
      )
      .subscribe();
  }

  loadMoviesByGender(gender: string): void {
    this.listLoadingSubject.next(true);

    this.moviesService
      .getMoviesByGender(gender)
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        tap((movies) => this.updateMovieState(movies)),
        catchError((err) => {
          this.generalService.handleHttpError(err);
          return EMPTY;
        }),
        finalize(() => this.listLoadingSubject.next(false))
      )
      .subscribe();
  }

  loadMoviesByYear(year: number): void {
    this.listLoadingSubject.next(true);

    this.moviesService
      .getMoviesByYear(year)
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        tap((movies) => this.updateMovieState(movies)),
        catchError((err) => {
          this.generalService.handleHttpError(err);
          return EMPTY;
        }),
        finalize(() => this.listLoadingSubject.next(false))
      )
      .subscribe();
  }

  // ───────── ITEM → isLoadingItem$ ─────────
  loadMovieById(id: number): void {
    this.itemLoadingSubject.next(true);

    this.moviesService
      .getMovieById(id)
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        tap((movie) => this.selectedMovieSubject.next(movie)),
        catchError((err) => {
          this.generalService.handleHttpError(err);
          return EMPTY;
        }),
        finalize(() => this.itemLoadingSubject.next(false))
      )
      .subscribe();
  }

  // ───────── CRUD ─────────
  addMovie(movie: FormData): Observable<FormData> {
    this.itemLoadingSubject.next(true);

    return this.moviesService.add(movie).pipe(
      takeUntilDestroyed(this.destroyRef),
      tap(() => this.reloadCurrentFilter()),
      catchError((err) => {
        this.generalService.handleHttpError(err);
        return EMPTY;
      }),
      finalize(() => this.itemLoadingSubject.next(false))
    );
  }

  editMovie(movie: FormData): Observable<FormData> {
    this.itemLoadingSubject.next(true);

    return this.moviesService.edit(movie).pipe(
      takeUntilDestroyed(this.destroyRef),
      tap(() => this.reloadCurrentFilter()),
      catchError((err) => {
        this.generalService.handleHttpError(err);
        return EMPTY;
      }),
      finalize(() => this.itemLoadingSubject.next(false))
    );
  }

  deleteMovie(id: number): void {
    this.itemLoadingSubject.next(true);

    this.moviesService
      .delete(id)
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        tap(() => this.reloadCurrentFilter()),
        catchError((err) => {
          this.generalService.handleHttpError(err);
          return EMPTY;
        }),
        finalize(() => this.itemLoadingSubject.next(false))
      )
      .subscribe();
  }

  // ───────── HELPERS ─────────
  clearSelectedMovie(): void {
    this.selectedMovieSubject.next(null);
  }

  applyFilterWord(keyword: string): void {
    const all = this.moviesSubject.getValue();
    this.filteredMoviesSubject.next(
      filterByKeyword(all, keyword, [(b) => b.title, (b) => b.director])
    );
  }

  setCurrentFilter(filter: string | null): void {
    this.currentFilter = filter;
  }

  private reloadCurrentFilter(): void {
    if (this.currentFilter === null) {
      this.loadAllMovies();
    } else {
      this.loadMoviesByFilter(this.currentFilter);
    }
  }

  private updateMovieState(movies: MovieModel[]): void {
    this.moviesSubject.next(movies);
    this.filteredMoviesSubject.next(movies);
  }
  get totalMovies(): number {
    return count(this.moviesSubject.getValue());
  }

  get hasMovies(): boolean {
    return hasResults(this.moviesSubject.getValue());
  }
}
