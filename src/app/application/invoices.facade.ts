import { inject, Injectable } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { BehaviorSubject, EMPTY, Observable, Subject } from 'rxjs';
import { catchError, finalize, tap } from 'rxjs/operators';
import { InvoiceModelFullData } from 'src/app/core/interfaces/invoice.interface';
import { InvoicesService } from 'src/app/core/services/invoices.services';
import { includesNormalized, toSearchKey } from '../shared/utils/text.utils';
import { LoadableFacade } from './loadable.facade';

@Injectable({ providedIn: 'root' })
export class InvoicesFacade extends LoadableFacade {
  private readonly invoicesService = inject(InvoicesService);

  // ───────── STATE ─────────
  private readonly invoicesSubject = new BehaviorSubject<
    InvoiceModelFullData[] | null
  >(null);
  private readonly filteredInvoicesSubject = new BehaviorSubject<
    InvoiceModelFullData[] | null
  >(null);
  private readonly selectedInvoiceSubject =
    new BehaviorSubject<InvoiceModelFullData | null>(null);

  private readonly currentFilterSubject = new BehaviorSubject<string | null>(
    null
  );
  private readonly tabFilterSubject = new BehaviorSubject<string | null>(null);

  private readonly listLoadingSubject = new BehaviorSubject<boolean>(false);
  private readonly itemLoadingSubject = new BehaviorSubject<boolean>(false);

  // ───────── EVENTOS ─────────
  private readonly savedSubject = new Subject<InvoiceModelFullData>();
  private readonly deletedSubject = new Subject<number>();

  // ───────── PUBLIC STREAMS ─────────
  readonly invoices$ = this.invoicesSubject.asObservable();
  readonly filteredInvoices$ = this.filteredInvoicesSubject.asObservable();
  readonly selectedInvoice$ = this.selectedInvoiceSubject.asObservable();
  readonly currentFilter$ = this.currentFilterSubject.asObservable();
  readonly tabFilter$ = this.tabFilterSubject.asObservable();
  readonly saved$ = this.savedSubject.asObservable();
  readonly deleted$ = this.deletedSubject.asObservable();

  readonly isLoadingList$ = this.listLoadingSubject.asObservable();
  readonly isLoadingItem$ = this.itemLoadingSubject.asObservable();

  private currentFilter: number | null = null;

  // ───────── FILTROS / AÑO ─────────
  setCurrentFilter(year: number | null): void {
    this.currentFilter = year;
    this.currentFilterSubject.next(year?.toString() ?? null);
  }

  private reloadCurrentFilter(): void {
    if (this.currentFilter === null) {
      this.loadAllInvoices();
    } else {
      this.loadInvoicesByYear(this.currentFilter);
    }
  }

  // ───────── LISTA → isLoadingList$ ─────────
  loadAllInvoices(): void {
    this.setCurrentFilter(null);
    this.listLoadingSubject.next(true);

    this.invoicesService
      .getInvoices()
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        tap((invoices) => this.updateInvoiceState(invoices)),
        catchError((err) => {
          this.generalService.handleHttpError(err);
          return EMPTY;
        }),
        finalize(() => this.listLoadingSubject.next(false))
      )
      .subscribe();
  }

  loadInvoicesByYear(year: number): void {
    this.setCurrentFilter(year);
    this.listLoadingSubject.next(true);

    this.invoicesService
      .getInvoicesByYear(year)
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        tap((invoices) => this.updateInvoiceState(invoices)),
        catchError((err) => {
          this.generalService.handleHttpError(err);
          return EMPTY;
        }),
        finalize(() => this.listLoadingSubject.next(false))
      )
      .subscribe();
  }

  loadInvoicesBySubsidy(subsidy: string, year: number): void {
    this.listLoadingSubject.next(true);

    this.invoicesService
      .getInvoicesBySubsidy(subsidy, year)
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        tap((invoices) => this.updateInvoiceState(invoices)),
        catchError((err) => {
          this.generalService.handleHttpError(err);
          return EMPTY;
        }),
        finalize(() => this.listLoadingSubject.next(false))
      )
      .subscribe();
  }

  // ───────── ITEM → isLoadingItem$ ─────────
  loadInvoiceById(id: number): void {
    this.itemLoadingSubject.next(true);

    this.invoicesService
      .getInvoiceById(id)
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        tap((invoice) => this.selectedInvoiceSubject.next(invoice)),
        catchError((err) => {
          this.generalService.handleHttpError(err);
          return EMPTY;
        }),
        finalize(() => this.itemLoadingSubject.next(false))
      )
      .subscribe();
  }

  // ───────── CRUD (isLoadingItem$) ─────────
  addInvoice(invoice: FormData): Observable<InvoiceModelFullData> {
    this.itemLoadingSubject.next(true);

    return this.invoicesService.add(invoice).pipe(
      takeUntilDestroyed(this.destroyRef),
      tap((inv) => {
        this.savedSubject.next(inv);
        this.reloadCurrentFilter();
      }),
      catchError((err) => {
        this.generalService.handleHttpError(err);
        return EMPTY;
      }),
      finalize(() => this.itemLoadingSubject.next(false))
    );
  }

  editInvoice(invoice: FormData): Observable<InvoiceModelFullData> {
    this.itemLoadingSubject.next(true);

    return this.invoicesService.edit(invoice).pipe(
      takeUntilDestroyed(this.destroyRef),
      tap((inv) => {
        this.savedSubject.next(inv);
        this.reloadCurrentFilter();
      }),
      catchError((err) => {
        this.generalService.handleHttpError(err);
        return EMPTY;
      }),
      finalize(() => this.itemLoadingSubject.next(false))
    );
  }

  deleteInvoice(id: number): void {
    this.itemLoadingSubject.next(true);

    this.invoicesService
      .delete(id)
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        tap(() => {
          this.deletedSubject.next(id);
          this.reloadCurrentFilter();
        }),
        catchError((err) => {
          this.generalService.handleHttpError(err);
          return EMPTY;
        }),
        finalize(() => this.itemLoadingSubject.next(false))
      )
      .subscribe();
  }

  // ───────── FILTROS / BÚSQUEDAS ─────────
  applyFilterWord(keyword: string): void {
    const list = this.invoicesSubject.getValue();
    const key = toSearchKey(keyword);

    if (!list) {
      this.filteredInvoicesSubject.next(list);
      return;
    }

    if (!key) {
      this.filteredInvoicesSubject.next(list);
      return;
    }

    const filtered = list.filter((inv) =>
      [
        inv.creditor_company,
        inv.description,
        inv.creditor_contact,
        inv.creditor_cif,
      ]
        .filter(Boolean)
        .some((field) => includesNormalized(field!, key))
    );

    this.filteredInvoicesSubject.next(filtered);
  }

  applyFilterWordTab(typeInvoice: string): void {
    const list = this.invoicesSubject.getValue();
    if (!list) {
      this.filteredInvoicesSubject.next(list);
      return;
    }

    this.filteredInvoicesSubject.next(
      list.filter((inv) => inv.type_invoice === typeInvoice)
    );
  }

  // ───────── UTILIDADES ─────────
  clearSelectedInvoice(): void {
    this.selectedInvoiceSubject.next(null);
  }

  clearInvoices(): void {
    this.invoicesSubject.next([]);
    this.filteredInvoicesSubject.next([]);
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

  private updateInvoiceState(invoices: InvoiceModelFullData[] | null): void {
    if (!invoices) return;
    const sorted = this.invoicesService.sortInvoicesByDate(invoices);
    this.invoicesSubject.next(sorted);
    this.filteredInvoicesSubject.next(sorted);
  }
}
