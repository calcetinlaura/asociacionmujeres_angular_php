import { inject, Injectable } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { BehaviorSubject, Observable } from 'rxjs';
import { catchError, finalize, tap } from 'rxjs/operators';
import { CreditorWithInvoices } from 'src/app/core/interfaces/creditor.interface';
import { CreditorsService } from 'src/app/core/services/creditors.services';
import { includesNormalized, toSearchKey } from '../shared/utils/text.utils';
import { LoadableFacade } from './loadable.facade';

@Injectable({ providedIn: 'root' })
export class CreditorsFacade extends LoadableFacade {
  private readonly creditorsService = inject(CreditorsService);

  // State
  private readonly creditorsSubject = new BehaviorSubject<
    CreditorWithInvoices[] | null
  >(null);
  private readonly filteredCreditorsSubject = new BehaviorSubject<
    CreditorWithInvoices[] | null
  >(null);
  private readonly selectedCreditorSubject =
    new BehaviorSubject<CreditorWithInvoices | null>(null);

  // Loaders separados
  private readonly listLoadingSubject = new BehaviorSubject<boolean>(false);
  private readonly itemLoadingSubject = new BehaviorSubject<boolean>(false);

  // Streams públicos
  readonly creditors$ = this.creditorsSubject.asObservable();
  readonly filteredCreditors$ = this.filteredCreditorsSubject.asObservable();
  readonly selectedCreditor$ = this.selectedCreditorSubject.asObservable();

  // Para la UI
  readonly isLoadingList$ = this.listLoadingSubject.asObservable();
  readonly isLoadingItem$ = this.itemLoadingSubject.asObservable();

  // Filtro actual (por categoría) para recargar tras add/edit/delete
  private currentFilter: string | null = null;

  // ───────── LISTA (isLoadingList$)
  loadAllCreditors(): void {
    this.setCurrentFilter(null);
    this.listLoadingSubject.next(true);
    this.creditorsService
      .getCreditors()
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        catchError((err) => this.generalService.handleHttpError(err)),
        finalize(() => this.listLoadingSubject.next(false))
      )
      .subscribe((creditors) => this.updateCreditorState(creditors));
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
        catchError((err) => this.generalService.handleHttpError(err)),
        finalize(() => this.listLoadingSubject.next(false))
      )
      .subscribe((creditors) => this.updateCreditorState(creditors));
  }

  // ───────── ITEM (isLoadingItem$)
  loadCreditorById(id: number): void {
    this.itemLoadingSubject.next(true);
    this.creditorsService
      .getCreditorById(id)
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        catchError((err) => this.generalService.handleHttpError(err)),
        finalize(() => this.itemLoadingSubject.next(false))
      )
      .subscribe((creditor) => this.selectedCreditorSubject.next(creditor));
  }

  addCreditor(creditor: FormData): Observable<FormData> {
    this.itemLoadingSubject.next(true);
    return this.creditorsService.add(creditor).pipe(
      takeUntilDestroyed(this.destroyRef),
      tap(() => this.reloadCurrentFilter()),
      catchError((err) => this.generalService.handleHttpError(err)),
      finalize(() => this.itemLoadingSubject.next(false))
    );
  }

  editCreditor(creditor: FormData): Observable<FormData> {
    this.itemLoadingSubject.next(true);
    return this.creditorsService.edit(creditor).pipe(
      takeUntilDestroyed(this.destroyRef),
      tap(() => this.reloadCurrentFilter()),
      catchError((err) => this.generalService.handleHttpError(err)),
      finalize(() => this.itemLoadingSubject.next(false))
    );
  }

  deleteCreditor(id: number): void {
    this.itemLoadingSubject.next(true);
    this.creditorsService
      .delete(id)
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        catchError((err) => this.generalService.handleHttpError(err)),
        finalize(() => this.itemLoadingSubject.next(false))
      )
      .subscribe(() => this.reloadCurrentFilter());
  }

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
      return;
    }
    this.loadCreditorsByCategory(this.currentFilter);
  }

  private updateCreditorState(creditors: CreditorWithInvoices[]): void {
    this.creditorsSubject.next(creditors);
    this.filteredCreditorsSubject.next(creditors);
  }
}
