import { DestroyRef, inject } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import {
  asyncScheduler,
  BehaviorSubject,
  catchError,
  EMPTY,
  finalize,
  Observable,
  observeOn,
  tap,
} from 'rxjs';
import { GeneralService } from 'src/app/core/services/generalService.service';

export abstract class LoadableFacade {
  protected readonly destroyRef = inject(DestroyRef);
  protected readonly generalService = inject(GeneralService);

  protected readonly loadingSubject = new BehaviorSubject<boolean>(false);
  readonly isLoading$ = this.loadingSubject.asObservable();

  /** Ejecuta un observable con spinner mínimo, auto-unsubscribe y manejo de error. */
  protected executeWithLoading<T>(
    source$: Observable<T>,
    sideEffect?: (value: T) => void,
    minMs = 150
  ): void {
    const start = performance.now();
    this.loadingSubject.next(true);

    source$
      .pipe(
        // Da tiempo a pintar el spinner
        observeOn(asyncScheduler),
        takeUntilDestroyed(this.destroyRef),
        tap((v) => sideEffect?.(v)),
        catchError((err) => {
          this.generalService.handleHttpError(err);
          return EMPTY;
        }),
        finalize(() => {
          const elapsed = performance.now() - start;
          const wait = Math.max(0, minMs - elapsed);
          setTimeout(() => this.loadingSubject.next(false), wait);
        })
      )
      .subscribe();
  }

  /** Envuelve un stream para controlar loading pero te devuelve el observable (no subscribe). */
  protected wrapWithLoading<T>(
    source$: Observable<T>,
    minMs = 150
  ): Observable<T> {
    const start = performance.now();
    this.loadingSubject.next(true);

    return source$.pipe(
      observeOn(asyncScheduler),
      finalize(() => {
        const elapsed = performance.now() - start;
        const wait = Math.max(0, minMs - elapsed);
        setTimeout(() => this.loadingSubject.next(false), wait);
      })
    );
  }
}
