import { DestroyRef, inject, Injectable } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { BehaviorSubject, catchError, Observable, tap } from 'rxjs';
import {
  CreditorModel,
  CreditorWithInvoices,
} from 'src/app/core/interfaces/creditor.interface';
import { CreditorsService } from 'src/app/core/services/creditors.services';
import { InvoicesService } from 'src/app/core/services/invoices.services';
import { InvoiceModelFullData } from '../core/interfaces/invoice.interface';
import { GeneralService } from '../shared/services/generalService.service';

@Injectable({
  providedIn: 'root',
})
export class CreditorsFacade {
  private readonly destroyRef = inject(DestroyRef);
  private readonly creditorsService = inject(CreditorsService);
  private readonly generalService = inject(GeneralService);
  private readonly invoicesService = inject(InvoicesService);

  private readonly creditorsSubject = new BehaviorSubject<
    CreditorWithInvoices[] | null
  >(null);
  private readonly filteredCreditorsSubject = new BehaviorSubject<
    CreditorWithInvoices[] | null
  >(null);
  private readonly selectedCreditorSubject =
    new BehaviorSubject<CreditorWithInvoices | null>(null);

  creditors$ = this.creditorsSubject.asObservable();
  filteredCreditors$ = this.filteredCreditorsSubject.asObservable();
  selectedCreditor$ = this.selectedCreditorSubject.asObservable();
  currentFilter: string = 'TODOS';

  constructor() {}

  // Filtro actual
  setCurrentFilter(filter: string): void {
    this.currentFilter = filter;
    this.loadCreditorsByFilter(filter);
  }

  private reloadCurrentFilter(): void {
    this.loadCreditorsByFilter(this.currentFilter);
  }

  loadCreditorsByFilter(filter: string): void {
    const loaders: Record<string, () => void> = {
      TODOS: () => this.loadAllCreditors(),
    };

    (loaders[filter] || (() => this.loadCreditorsByCategory(filter)))();
  }

  loadAllCreditors(): void {
    this.creditorsService
      .getCreditors()
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        tap((creditors) => this.loadInvoicesAndEnrich(creditors)),
        catchError((err) => this.generalService.handleHttpError(err))
      )
      .subscribe();
  }

  loadCreditorsByCategory(category: string): void {
    this.creditorsService
      .getCreditorsByCategory(category)
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        tap((creditors) => this.loadInvoicesAndEnrich(creditors)),
        catchError((err) => this.generalService.handleHttpError(err))
      )
      .subscribe();
  }

  loadCreditorById(id: number): void {
    this.creditorsService
      .getCreditorById(id)
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        tap((creditor) => this.selectedCreditorSubject.next(creditor)),
        catchError((err) => this.generalService.handleHttpError(err))
      )
      .subscribe();
  }

  private loadInvoicesAndEnrich(creditors: CreditorWithInvoices[]): void {
    this.invoicesService
      .getInvoices()
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        tap((invoices) => {
          const enriched = this.enrichCreditorsWithInvoices(
            creditors,
            invoices
          );
          this.updateCreditorState(enriched);
        }),
        catchError((err) => this.generalService.handleHttpError(err))
      )
      .subscribe();
  }

  private enrichCreditorsWithInvoices(
    creditors: CreditorWithInvoices[],
    invoices: InvoiceModelFullData[]
  ): CreditorWithInvoices[] {
    const invoiceMap: Record<number, InvoiceModelFullData[]> = {};

    invoices.forEach((invoice) => {
      if (invoice.creditor_id) {
        if (!invoiceMap[invoice.creditor_id]) {
          invoiceMap[invoice.creditor_id] = [];
        }
        invoiceMap[invoice.creditor_id].push(invoice);
      }
    });

    return creditors.map((creditor) => {
      const creditorInvoices = invoiceMap[creditor.id] || [];
      return {
        ...creditor,
        invoices: creditorInvoices,
        numInvoices: creditorInvoices.length,
        invoiceIds: creditorInvoices.map((inv) => inv.id),
      };
    });
  }

  addCreditor(creditor: CreditorModel): Observable<CreditorModel> {
    return this.creditorsService.add(creditor).pipe(
      tap(() => this.reloadCurrentFilter()),
      catchError((err) => this.generalService.handleHttpError(err))
    );
  }

  editCreditor(id: number, creditor: CreditorModel): Observable<CreditorModel> {
    return this.creditorsService.edit(id, creditor).pipe(
      tap(() => this.reloadCurrentFilter()),
      catchError((err) => this.generalService.handleHttpError(err))
    );
  }

  deleteCreditor(id: number): void {
    this.creditorsService
      .delete(id)
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        tap(() => this.reloadCurrentFilter()),
        catchError((err) => this.generalService.handleHttpError(err))
      )
      .subscribe();
  }

  clearSelectedCreditor(): void {
    this.selectedCreditorSubject.next(null);
  }

  applyFilterWord(keyword: string): void {
    const allCreditors = this.creditorsSubject.getValue();

    if (!keyword.trim() || !allCreditors) {
      this.filteredCreditorsSubject.next(allCreditors ?? []);
      return;
    }

    const search = keyword.trim().toLowerCase();

    const filtered = allCreditors.filter(
      (creditor) =>
        creditor.company.toLowerCase().includes(search) ||
        (creditor.contact && creditor.contact.toLowerCase().includes(search))
    );

    this.filteredCreditorsSubject.next(filtered);
  }

  updateCreditorState(creditors: CreditorWithInvoices[]): void {
    this.creditorsSubject.next(creditors);
    this.filteredCreditorsSubject.next(creditors);
  }
}
