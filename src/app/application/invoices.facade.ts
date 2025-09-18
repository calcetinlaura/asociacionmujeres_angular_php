import { inject, Injectable } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { BehaviorSubject, Observable, Subject } from 'rxjs';
import { catchError, tap } from 'rxjs/operators';
import { InvoiceModelFullData } from 'src/app/core/interfaces/invoice.interface';
import { InvoicesService } from 'src/app/core/services/invoices.services';
import { includesNormalized, toSearchKey } from '../shared/utils/text.utils';
import { LoadableFacade } from './loadable.facade';

@Injectable({ providedIn: 'root' })
export class InvoicesFacade extends LoadableFacade {
  private readonly invoicesService = inject(InvoicesService);

  // Estado
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

  // Eventos
  private readonly savedSubject = new Subject<InvoiceModelFullData>();
  private readonly deletedSubject = new Subject<number>();

  // Streams públicos
  readonly invoices$ = this.invoicesSubject.asObservable();
  readonly filteredInvoices$ = this.filteredInvoicesSubject.asObservable();
  readonly selectedInvoice$ = this.selectedInvoiceSubject.asObservable();
  readonly currentFilter$ = this.currentFilterSubject.asObservable();
  readonly tabFilter$ = this.tabFilterSubject.asObservable();
  readonly saved$ = this.savedSubject.asObservable();
  readonly deleted$ = this.deletedSubject.asObservable();

  // Filtro actual (año) para recargas
  private currentFilter: number | null = null;

  // ---------- Filtros / Año ----------
  setCurrentFilter(year: number | null): void {
    this.currentFilter = year;
    this.currentFilterSubject.next(year?.toString() ?? null);
  }

  private reloadCurrentFilter(): void {
    if (this.currentFilter === null) {
      this.loadAllInvoices();
      return;
    }
    this.loadInvoicesByYear(this.currentFilter);
  }

  // ---------- Cargas ----------
  loadAllInvoices(): void {
    this.setCurrentFilter(null);
    this.executeWithLoading(this.invoicesService.getInvoices(), (invoices) =>
      this.updateInvoiceState(invoices)
    );
  }

  loadInvoicesByYear(year: number): void {
    this.setCurrentFilter(year);
    this.executeWithLoading(
      this.invoicesService.getInvoicesByYear(year),
      (invoices) => this.updateInvoiceState(invoices)
    );
  }

  loadInvoicesBySubsidy(subsidy: string, year: number): void {
    this.executeWithLoading(
      this.invoicesService.getInvoicesBySubsidy(subsidy, year),
      (invoices) => this.updateInvoiceState(invoices)
    );
  }

  loadInvoiceById(id: number): void {
    this.executeWithLoading(
      this.invoicesService.getInvoiceById(id),
      (invoice) => this.selectedInvoiceSubject.next(invoice)
    );
  }

  // ---------- CRUD ----------
  /** Devuelve el invoice guardado y emite saved$ */
  addInvoice(invoice: FormData): Observable<InvoiceModelFullData> {
    return this.wrapWithLoading(this.invoicesService.add(invoice)).pipe(
      takeUntilDestroyed(this.destroyRef),
      tap((inv) => {
        this.savedSubject.next(inv);
        this.reloadCurrentFilter();
      }),
      catchError((err) => this.generalService.handleHttpError(err))
    );
  }

  /** Devuelve el invoice editado y emite saved$ */
  editInvoice(invoice: FormData): Observable<InvoiceModelFullData> {
    return this.wrapWithLoading(this.invoicesService.edit(invoice)).pipe(
      takeUntilDestroyed(this.destroyRef),
      tap((inv) => {
        this.savedSubject.next(inv);
        this.reloadCurrentFilter();
      }),
      catchError((err) => this.generalService.handleHttpError(err))
    );
  }

  /** Devuelve el id borrado y emite deleted$ */
  // deleteInvoice(id: number): Observable<number> {
  //   return this.wrapWithLoading(this.invoicesService.delete(id)).pipe(
  //     takeUntilDestroyed(this.destroyRef),
  //     tap(() => {
  //       this.deletedSubject.next(id);
  //       this.reloadCurrentFilter();
  //     }),
  //     map(() => id),
  //     catchError((err) => this.generalService.handleHttpError(err))
  //   );
  // }
  deleteInvoice(id: number): void {
    this.executeWithLoading(this.invoicesService.delete(id), () => {
      this.deletedSubject.next(id);
      this.reloadCurrentFilter();
    });
  }
  // ---------- Búsquedas / filtros ----------
  applyFilterWord(keyword: string): void {
    const list = this.invoicesSubject.getValue();
    const k = toSearchKey(keyword);

    if (!list || !k) {
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
        .some((field) => includesNormalized(field!, k))
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

  // ---------- Utilidades ----------
  clearSelectedInvoice(): void {
    this.selectedInvoiceSubject.next(null);
  }

  clearInvoices(): void {
    this.invoicesSubject.next([]);
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
