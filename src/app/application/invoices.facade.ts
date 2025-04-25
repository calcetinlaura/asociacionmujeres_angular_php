import { DestroyRef, inject, Injectable } from '@angular/core';
import { BehaviorSubject, Observable, throwError } from 'rxjs';
import { catchError, tap } from 'rxjs/operators';
import { InvoiceModelFullData } from 'src/app/core/interfaces/invoice.interface';
import { InvoicesService } from 'src/app/core/services/invoices.services';
import { GeneralService } from '../shared/services/generalService.service';

@Injectable({ providedIn: 'root' })
export class InvoicesFacade {
  private readonly destroyRef = inject(DestroyRef);
  private readonly invoicesService = inject(InvoicesService);
  private readonly generalService = inject(GeneralService);

  private readonly invoicesSubject = new BehaviorSubject<
    InvoiceModelFullData[]
  >([]);
  private readonly filteredInvoicesSubject = new BehaviorSubject<
    InvoiceModelFullData[] | null
  >(null);
  private readonly selectedInvoiceSubject =
    new BehaviorSubject<InvoiceModelFullData | null>(null);
  private readonly currentFilterSubject = new BehaviorSubject<string | null>(
    null
  );
  private tabFilterSubject = new BehaviorSubject<string | null>(null);
  private readonly isLoadingSubject = new BehaviorSubject<boolean>(false);

  tabFilter$ = this.tabFilterSubject.asObservable();
  invoices$ = this.invoicesSubject.asObservable();
  filteredInvoices$ = this.filteredInvoicesSubject.asObservable();
  selectedInvoice$ = this.selectedInvoiceSubject.asObservable();
  currentFilter$ = this.currentFilterSubject.asObservable();
  isLoading$ = this.isLoadingSubject.asObservable();

  setCurrentFilter(filter: string): void {
    this.currentFilterSubject.next(filter);
    this.loadInvoicesByYear(+filter);
  }

  loadAllInvoices(): void {
    this.isLoadingSubject.next(true);
    this.invoicesService
      .getInvoices()
      .pipe(
        tap((invoices) => this.updateInvoiceState(invoices)),
        catchError((err) => this.handleError(err))
      )
      .subscribe();
  }

  loadInvoicesByYear(year: number): void {
    this.isLoadingSubject.next(true);
    this.invoicesService
      .getInvoicesByYear(year)
      .pipe(
        tap((invoices) => this.updateInvoiceState(invoices)),
        catchError((err) => this.handleError(err))
      )
      .subscribe();
  }

  loadInvoicesBySubsidy(subsidy: string, year: number): void {
    this.isLoadingSubject.next(true);
    this.invoicesService
      .getInvoicesBySubsidy(subsidy, year)
      .pipe(
        tap((invoices) => this.updateInvoiceState(invoices)),
        catchError((err) => this.handleError(err))
      )
      .subscribe();
  }

  loadInvoiceById(id: number): void {
    this.isLoadingSubject.next(true);
    this.invoicesService
      .getInvoiceById(id)
      .pipe(
        tap((invoice) => this.selectedInvoiceSubject.next(invoice)),
        catchError((err) => this.handleError(err))
      )
      .subscribe();
  }

  addInvoice(invoice: FormData): Observable<any> {
    return this.invoicesService.add(invoice).pipe(
      tap(() => this.reloadCurrentFilter()),
      catchError((err) => this.handleError(err))
    );
  }

  editInvoice(id: number, invoice: FormData): Observable<any> {
    return this.invoicesService.edit(id, invoice).pipe(
      tap(() => this.reloadCurrentFilter()),
      catchError((err) => this.handleError(err))
    );
  }

  deleteInvoice(id: number): void {
    this.invoicesService
      .delete(id)
      .pipe(
        tap(() => this.reloadCurrentFilter()),
        catchError((err) => this.handleError(err))
      )
      .subscribe();
  }

  applyFilterWord(keyword: string): void {
    const search = keyword.trim().toLowerCase();
    const invoices = this.invoicesSubject.getValue();

    if (!search) {
      this.filteredInvoicesSubject.next(invoices);
      return;
    }

    const filtered = invoices.filter(
      (invoice) =>
        invoice.creditor_company?.toLowerCase().includes(search) ||
        invoice.description?.toLowerCase().includes(search) ||
        invoice.creditor_contact?.toLowerCase().includes(search)
    );

    this.filteredInvoicesSubject.next(filtered);
  }

  applyFilterWordTab(typeInvoice: string): void {
    const invoices = this.invoicesSubject.getValue();

    const filtered = invoices.filter(
      (invoice) => invoice.type_invoice === typeInvoice
    );
    this.filteredInvoicesSubject.next(filtered);
  }

  clearSelectedInvoice(): void {
    this.selectedInvoiceSubject.next(null);
  }

  private reloadCurrentFilter(): void {
    const filter = this.currentFilterSubject.getValue();
    if (filter) this.loadInvoicesByYear(+filter);
  }

  private updateInvoiceState(invoices: InvoiceModelFullData[] | null): void {
    if (!invoices) return;

    const sortedInvoices = this.invoicesService.sortInvoicesByDate(invoices);

    this.invoicesSubject.next(sortedInvoices);
    this.filteredInvoicesSubject.next(sortedInvoices);
    this.isLoadingSubject.next(false); // Desactivamos el spinner
  }

  private handleError(error: any): Observable<never> {
    this.generalService.handleHttpError(error);
    return throwError(() => error);
  }
  setTabFilter(filter: string | null): void {
    this.tabFilterSubject.next(filter);
  }
  clearTabFilter(): void {
    this.tabFilterSubject.next(null);
  }

  get currentTabFilter(): string | null {
    return this.tabFilterSubject.value;
  }
}
