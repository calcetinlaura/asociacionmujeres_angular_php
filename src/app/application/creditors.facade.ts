import { DestroyRef, inject, Injectable } from '@angular/core';
import { BehaviorSubject, Observable, tap } from 'rxjs';
import { CreditorsService } from '../core/services/creditors.services';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { CreditorModel } from '../core/interfaces/creditor.interface';

@Injectable({
  providedIn: 'root',
})
export class CreditorsFacade {
  private destroyRef = inject(DestroyRef);

  // Subjects to manage the state of creditors and current selected creditor
  private creditorsSubject = new BehaviorSubject<CreditorModel[] | null>(null);
  private selectedCreditorSubject = new BehaviorSubject<CreditorModel | null>(
    null
  );

  creditors$ = this.creditorsSubject.asObservable();
  selectedCreditor$ = this.selectedCreditorSubject.asObservable();

  constructor(private creditorsService: CreditorsService) {}

  // Load all creditors
  loadCreditors(): void {
    this.creditorsService
      .getAll()
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        tap((creditors: CreditorModel[]) =>
          this.creditorsSubject.next(creditors)
        )
      )
      .subscribe();
  }

  // Load a specific creditor by ID
  loadCreditorById(id: number): void {
    this.creditorsService
      .getById(id)
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        tap((creditor: CreditorModel) =>
          this.selectedCreditorSubject.next(creditor)
        )
      )
      .subscribe();
  }

  // Add a new creditor
  addCreditor(creditor: CreditorModel): Observable<CreditorModel> {
    return this.creditorsService.add(creditor).pipe(
      tap(() => this.loadCreditors()) // Reload creditors after adding
    );
  }

  // Edit a creditor
  editCreditor(itemId: number, creditor: CreditorModel): void {
    this.creditorsService
      .edit(itemId, creditor)
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        tap(() => this.loadCreditors())
      )
      .subscribe();
  }

  // Delete a creditor
  deleteCreditor(id: number): void {
    this.creditorsService
      .delete(id)
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        tap(() => this.loadCreditors())
      )
      .subscribe();
  }

  // Clear selected creditor
  clearSelectedCreditor(): void {
    this.selectedCreditorSubject.next(null);
  }
}
