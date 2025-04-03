import { HttpErrorResponse } from '@angular/common/http';
import { DestroyRef, inject, Injectable } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { BehaviorSubject, catchError, Observable, tap, throwError } from 'rxjs';
import { MovieModel } from 'src/app/core/interfaces/movie.interface';
import { MoviesService } from 'src/app/core/services/movies.services';

@Injectable({
  providedIn: 'root',
})
export class MoviesFacade {
  private readonly destroyRef = inject(DestroyRef);
  private readonly moviesService = inject(MoviesService);
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
        catchError(this.handleError)
      )
      .subscribe();
  }

  loadMoviesByLatest(): void {
    this.moviesService
      .getMoviesByLatest()
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        tap((movies: MovieModel[]) => this.updateMovieState(movies)),
        catchError(this.handleError)
      )
      .subscribe();
  }

  loadMoviesByGender(gender: string): void {
    this.moviesService
      .getMoviesByGender(gender)
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        tap((movies: MovieModel[]) => this.updateMovieState(movies)),
        catchError(this.handleError)
      )
      .subscribe();
  }

  loadMoviesByYear(year: number): void {
    this.moviesService
      .getMoviesByYear(year)
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        tap((movies: MovieModel[]) => this.updateMovieState(movies)),
        catchError(this.handleError)
      )
      .subscribe();
  }

  loadMovieById(id: number): void {
    this.moviesService
      .getMovieById(id)
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        tap((movie: MovieModel) => this.selectedMovieSubject.next(movie)),
        catchError(this.handleError)
      )
      .subscribe();
  }

  addMovie(movie: FormData): Observable<FormData> {
    return this.moviesService.add(movie).pipe(
      takeUntilDestroyed(this.destroyRef),
      tap(() => this.reloadCurrentFilter()),
      catchError(this.handleError)
    );
  }

  editMovie(itemId: number, movie: FormData): Observable<FormData> {
    return this.moviesService.edit(itemId, movie).pipe(
      takeUntilDestroyed(this.destroyRef),
      tap(() => this.reloadCurrentFilter()),
      catchError(this.handleError)
    );
  }

  deleteMovie(id: number): void {
    this.moviesService
      .delete(id)
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        tap(() => this.reloadCurrentFilter()),
        catchError(this.handleError)
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
