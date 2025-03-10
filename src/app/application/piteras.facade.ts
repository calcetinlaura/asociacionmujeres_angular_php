import { DestroyRef, inject, Injectable } from '@angular/core';
import { BehaviorSubject, catchError, Observable, tap, throwError } from 'rxjs';
import { PiterasService } from '../core/services/piteras.services';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { PiteraModel } from '../core/interfaces/pitera.interface';
import { HttpErrorResponse } from '@angular/common/http';

@Injectable({
  providedIn: 'root',
})
export class PiterasFacade {
  private destroyRef = inject(DestroyRef);
  private piterasService = inject(PiterasService);
  private piterasSubject = new BehaviorSubject<PiteraModel[] | null>(null);
  private selectedPiterasSubject = new BehaviorSubject<PiteraModel | null>(
    null
  );
  piteras$ = this.piterasSubject.asObservable();
  selectedPitera$ = this.selectedPiterasSubject.asObservable();

  constructor() {}

  loadAllPiteras(): void {
    this.piterasService
      .getPiteras()
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        tap((piteras: PiteraModel[]) => this.piterasSubject.next(piteras)),
        catchError(this.handleError)
      )
      .subscribe();
  }

  loadPiteraById(id: number): void {
    this.piterasService
      .getPiteraById(id)
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        tap((pitera: PiteraModel) => this.selectedPiterasSubject.next(pitera)),
        catchError(this.handleError)
      )
      .subscribe();
  }

  addPitera(pitera: FormData): Observable<FormData> {
    return this.piterasService.add(pitera).pipe(
      takeUntilDestroyed(this.destroyRef),
      tap(() => this.loadAllPiteras()),
      catchError(this.handleError)
    );
  }

  editPitera(itemId: number, pitera: FormData): Observable<FormData> {
    return this.piterasService.edit(itemId, pitera).pipe(
      takeUntilDestroyed(this.destroyRef),
      tap(() => this.loadAllPiteras()),
      catchError(this.handleError)
    );
  }

  deletePitera(id: number): void {
    this.piterasService
      .delete(id)
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        tap(() => this.loadAllPiteras()),
        catchError(this.handleError)
      )
      .subscribe();
  }

  clearSelectedPitera(): void {
    this.selectedPiterasSubject.next(null);
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
