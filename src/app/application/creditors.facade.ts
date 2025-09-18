import { inject, Injectable } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { BehaviorSubject, catchError, Observable, tap } from 'rxjs';
import { CreditorWithInvoices } from 'src/app/core/interfaces/creditor.interface';
import { CreditorsService } from 'src/app/core/services/creditors.services';
import { includesNormalized, toSearchKey } from '../shared/utils/text.utils';
import { LoadableFacade } from './loadable.facade';

@Injectable({ providedIn: 'root' })
export class CreditorsFacade extends LoadableFacade {
  private readonly creditorsService = inject(CreditorsService);

  // State propio
  private readonly creditorsSubject = new BehaviorSubject<
    CreditorWithInvoices[] | null
  >(null);
  private readonly filteredCreditorsSubject = new BehaviorSubject<
    CreditorWithInvoices[] | null
  >(null);
  private readonly selectedCreditorSubject =
    new BehaviorSubject<CreditorWithInvoices | null>(null);

  // Streams públicos
  readonly creditors$ = this.creditorsSubject.asObservable();
  readonly filteredCreditors$ = this.filteredCreditorsSubject.asObservable();
  readonly selectedCreditor$ = this.selectedCreditorSubject.asObservable();

  // Filtro actual (por categoría) para recargar tras add/edit/delete
  private currentFilter: string | null = null;

  loadAllCreditors(): void {
    this.setCurrentFilter(null);
    this.executeWithLoading(this.creditorsService.getCreditors(), (creditors) =>
      this.updateCreditorState(creditors)
    );
  }

  loadCreditorsByFilter(filter: string): void {
    this.setCurrentFilter(filter);
    this.executeWithLoading(
      this.creditorsService.getCreditorsByCategory(filter),
      (agents) => this.updateCreditorState(agents)
    );
  }

  loadCreditorsByCategory(category: string): void {
    this.executeWithLoading(
      this.creditorsService.getCreditorsByCategory(category),
      (creditors) => this.updateCreditorState(creditors)
    );
  }

  loadCreditorById(id: number): void {
    this.executeWithLoading(
      this.creditorsService.getCreditorById(id),
      (creditor) => this.selectedCreditorSubject.next(creditor)
    );
  }

  addCreditor(creditor: FormData): Observable<FormData> {
    return this.wrapWithLoading(this.creditorsService.add(creditor)).pipe(
      takeUntilDestroyed(this.destroyRef),
      tap(() => this.reloadCurrentFilter()),
      catchError((err) => this.generalService.handleHttpError(err))
    );
  }

  editCreditor(creditor: FormData): Observable<FormData> {
    return this.wrapWithLoading(this.creditorsService.edit(creditor)).pipe(
      takeUntilDestroyed(this.destroyRef),
      tap(() => this.reloadCurrentFilter()),
      catchError((err) => this.generalService.handleHttpError(err))
    );
  }

  deleteCreditor(id: number): void {
    this.executeWithLoading(this.creditorsService.delete(id), () =>
      this.reloadCurrentFilter()
    );
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
