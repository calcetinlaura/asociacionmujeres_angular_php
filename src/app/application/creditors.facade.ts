import { DestroyRef, inject, Injectable } from '@angular/core';
import { BehaviorSubject, catchError, Observable, tap, throwError } from 'rxjs';
import { CreditorsService } from '../core/services/creditors.services';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { CreditorModel } from '../core/interfaces/creditor.interface';
import { HttpErrorResponse } from '@angular/common/http';

@Injectable({
  providedIn: 'root',
})
export class CreditorsFacade {
  private destroyRef = inject(DestroyRef);
  private creditorsService = inject(CreditorsService);
  private creditorsSubject = new BehaviorSubject<CreditorModel[] | null>(null);
  private selectedCreditorSubject = new BehaviorSubject<CreditorModel | null>(
    null
  );
  creditors$ = this.creditorsSubject.asObservable();
  selectedCreditor$ = this.selectedCreditorSubject.asObservable();

  constructor() {}

  loadAllCreditors(): void {
    this.creditorsService
      .getCreditors()
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        tap((creditors: CreditorModel[]) =>
          this.updateCreditorState(creditors)
        ),
        catchError(this.handleError)
      )
      .subscribe();
  }

  loadCreditorById(id: number): void {
    this.creditorsService
      .getCreditorById(id)
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        tap((creditor: CreditorModel) =>
          this.selectedCreditorSubject.next(creditor)
        ),
        catchError(this.handleError)
      )
      .subscribe();
  }

  // Add a new creditor
  addCreditor(creditor: CreditorModel): Observable<CreditorModel> {
    return this.creditorsService
      .add(creditor)
      .pipe(tap(() => this.loadAllCreditors()));
  }

  // Edit a creditor
  editCreditor(
    itemId: number,
    creditor: CreditorModel
  ): Observable<CreditorModel> {
    return this.creditorsService.edit(itemId, creditor).pipe(
      takeUntilDestroyed(this.destroyRef),
      tap(() => this.loadAllCreditors()),
      catchError(this.handleError)
    );
  }

  deleteCreditor(id: number): void {
    this.creditorsService
      .delete(id)
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        tap(() => this.loadAllCreditors()),
        catchError(this.handleError)
      )
      .subscribe();
  }

  clearSelectedCreditor(): void {
    this.selectedCreditorSubject.next(null);
  }
  updateCreditorState(books: CreditorModel[]): void {
    this.creditorsSubject.next(books);
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
