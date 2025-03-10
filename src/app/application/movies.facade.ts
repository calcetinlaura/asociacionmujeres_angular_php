import { DestroyRef, inject, Injectable } from '@angular/core';
import { BehaviorSubject, catchError, Observable, tap, throwError } from 'rxjs';
import { MoviesService } from '../core/services/movies.services';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { MovieModel } from '../core/interfaces/movie.interface';
import { HttpErrorResponse } from '@angular/common/http';

@Injectable({
  providedIn: 'root',
})
export class MoviesFacade {
  private destroyRef = inject(DestroyRef);
  private moviesService = inject(MoviesService);
  private moviesSubject = new BehaviorSubject<MovieModel[] | null>(null);
  private filteredMoviesSubject = new BehaviorSubject<MovieModel[] | null>(
    null
  );
  private selectedMovieSubject = new BehaviorSubject<MovieModel | null>(null);

  movies$ = this.moviesSubject.asObservable();
  selectedMovie$ = this.selectedMovieSubject.asObservable();
  filteredMovies$ = this.filteredMoviesSubject.asObservable();

  constructor() {}

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

  addMovie(movie: FormData): Observable<FormData> {
    return this.moviesService.add(movie).pipe(
      tap(() => this.loadAllMovies()),
      catchError(this.handleError)
    );
  }

  editMovie(itemId: number, movie: FormData): Observable<FormData> {
    return this.moviesService.edit(itemId, movie).pipe(
      takeUntilDestroyed(this.destroyRef),
      tap(() => this.loadAllMovies()),
      catchError(this.handleError)
    );
  }

  deleteMovie(id: number): void {
    this.moviesService
      .delete(id)
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        tap(() => this.loadAllMovies()),
        catchError(this.handleError)
      )
      .subscribe();
  }

  clearSelectedMovie(): void {
    this.selectedMovieSubject.next(null);
  }

  applyFilter(keyword: string): void {
    const searchValue = keyword.toLowerCase();
    const allMovies = this.moviesSubject.getValue();

    if (!searchValue) {
      this.filteredMoviesSubject.next(allMovies);
    } else {
      const filteredMovies = this.moviesSubject
        .getValue()!
        .filter(
          (movie) =>
            movie.title.toLowerCase().includes(searchValue) ||
            (movie.director &&
              movie.director.toLowerCase().includes(searchValue))
        );

      this.filteredMoviesSubject.next(filteredMovies);
    }
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
