import { inject, Injectable } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { BehaviorSubject, EMPTY, Observable } from 'rxjs';
import { catchError, finalize, tap } from 'rxjs/operators';
import { CreditorWithInvoices } from 'src/app/core/interfaces/creditor.interface';
import { CreditorsService } from 'src/app/core/services/creditors.services';
import { includesNormalized, toSearchKey } from '../shared/utils/text.utils';
import { LoadableFacade } from './loadable.facade';

@Injectable({ providedIn: 'root' })
export class CreditorsFacade extends LoadableFacade {
  private readonly creditorsService = inject(CreditorsService);

  // ───────── STATE ─────────
  private readonly creditorsSubject = new BehaviorSubject<
    CreditorWithInvoices[] | null
  >(null);
  private readonly filteredCreditorsSubject = new BehaviorSubject<
    CreditorWithInvoices[] | null
  >(null);
  private readonly selectedCreditorSubject =
    new BehaviorSubject<CreditorWithInvoices | null>(null);

  private readonly listLoadingSubject = new BehaviorSubject<boolean>(false);
  private readonly itemLoadingSubject = new BehaviorSubject<boolean>(false);

  // ───────── PUBLIC STREAMS ─────────
  readonly creditors$ = this.creditorsSubject.asObservable();
  readonly filteredCreditors$ = this.filteredCreditorsSubject.asObservable();
  readonly selectedCreditor$ = this.selectedCreditorSubject.asObservable();
  readonly isLoadingList$ = this.listLoadingSubject.asObservable();
  readonly isLoadingItem$ = this.itemLoadingSubject.asObservable();

  private currentFilter: string | null = null;

  // ───────── LISTA (isLoadingList$) ─────────
  loadAllCreditors(): void {
    this.setCurrentFilter(null);
    this.listLoadingSubject.next(true);

    this.creditorsService
      .getCreditors()
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        tap((creditors) => this.updateCreditorState(creditors)),
        catchError((err) => {
          this.generalService.handleHttpError(err);
          return EMPTY;
        }),
        finalize(() => this.listLoadingSubject.next(false))
      )
      .subscribe();
  }

  loadCreditorsByFilter(filter: string): void {
    this.setCurrentFilter(filter);
    this.loadCreditorsByCategory(filter);
  }

  loadCreditorsByCategory(category: string): void {
    this.listLoadingSubject.next(true);

    this.creditorsService
      .getCreditorsByCategory(category)
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        tap((creditors) => this.updateCreditorState(creditors)),
        catchError((err) => {
          this.generalService.handleHttpError(err);
          return EMPTY;
        }),
        finalize(() => this.listLoadingSubject.next(false))
      )
      .subscribe();
  }

  // ───────── ITEM (isLoadingItem$) ─────────
  loadCreditorById(id: number): void {
    this.itemLoadingSubject.next(true);

    this.creditorsService
      .getCreditorById(id)
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        tap((creditor) => this.selectedCreditorSubject.next(creditor)),
        catchError((err) => {
          this.generalService.handleHttpError(err);
          return EMPTY;
        }),
        finalize(() => this.itemLoadingSubject.next(false))
      )
      .subscribe();
  }

  // ───────── CRUD ─────────
  addCreditor(creditor: FormData): Observable<FormData> {
    this.itemLoadingSubject.next(true);

    return this.creditorsService.add(creditor).pipe(
      takeUntilDestroyed(this.destroyRef),
      tap(() => this.reloadCurrentFilter()),
      catchError((err) => {
        this.generalService.handleHttpError(err);
        return EMPTY;
      }),
      finalize(() => this.itemLoadingSubject.next(false))
    );
  }

  editCreditor(creditor: FormData): Observable<FormData> {
    this.itemLoadingSubject.next(true);

    return this.creditorsService.edit(creditor).pipe(
      takeUntilDestroyed(this.destroyRef),
      tap(() => this.reloadCurrentFilter()),
      catchError((err) => {
        this.generalService.handleHttpError(err);
        return EMPTY;
      }),
      finalize(() => this.itemLoadingSubject.next(false))
    );
  }

  deleteCreditor(id: number): void {
    this.itemLoadingSubject.next(true);

    this.creditorsService
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
  clearSelectedCreditor(): void {
    this.selectedCreditorSubject.next(null);
  }

  applyFilterWord(keyword: string): void {
    const all = this.creditorsSubject.getValue();

    if (!all) {
      this.filteredCreditorsSubject.next(all);
      return;
    }

    if (!toSearchKey(keyword)) {
      this.filteredCreditorsSubject.next(all);
      return;
    }

    const filtered = all.filter((c) =>
      [c.company, c.contact]
        .filter(Boolean)
        .some((field) => includesNormalized(field!, keyword))
    );

    this.filteredCreditorsSubject.next(filtered);
  }

  setCurrentFilter(filter: string | null): void {
    this.currentFilter = filter;
  }

  private reloadCurrentFilter(): void {
    if (this.currentFilter === null) {
      this.loadAllCreditors();
    } else {
      this.loadCreditorsByCategory(this.currentFilter);
    }
  }

  private updateCreditorState(creditors: CreditorWithInvoices[]): void {
    this.creditorsSubject.next(creditors);
    this.filteredCreditorsSubject.next(creditors);
  }
}
