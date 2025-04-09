import { DestroyRef, inject, Injectable } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { BehaviorSubject, catchError, Observable, tap } from 'rxjs';
import { InvoiceModel } from 'src/app/core/interfaces/invoice.interface';
import { InvoicesService } from 'src/app/core/services/invoices.services';
import { GeneralService } from '../shared/services/generalService.service';

@Injectable({
  providedIn: 'root',
})
export class InvoicesFacade {
  private destroyRef = inject(DestroyRef);
  private invoicesService = inject(InvoicesService);
  private readonly generalService = inject(GeneralService);
  private invoicesSubject = new BehaviorSubject<InvoiceModel[]>([]);
  private filteredInvoicesByYearSubject = new BehaviorSubject<InvoiceModel[]>(
    []
  );
  private filteredInvoicesSubject = new BehaviorSubject<InvoiceModel[] | null>(
    null
  );
  private selectedInvoiceSubject = new BehaviorSubject<InvoiceModel | null>(
    null
  );
  private currentFilterTypeSubject = new BehaviorSubject<string | null>(null);

  invoices$ = this.invoicesSubject.asObservable();
  selectedInvoice$ = this.selectedInvoiceSubject.asObservable();
  filteredInvoicesByYear$ = this.filteredInvoicesByYearSubject.asObservable();
  filteredInvoices$ = this.filteredInvoicesSubject.asObservable();
  currentFilterType$ = this.currentFilterTypeSubject.asObservable();

  constructor() {}

  loadInvoices(): void {
    this.invoicesService
      .getInvoices()
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        tap((invoices: InvoiceModel[]) => {
          this.invoicesSubject.next(invoices);
          // Aplicar el filtro actual después de cargar las facturas
          const currentFilterType = this.currentFilterTypeSubject.getValue();
          this.applyFilterWordTab(currentFilterType); // Asegúrate de aplicar el filtro actual
        })
      )
      .subscribe();
  }

  loadInvoicesBySubsidy(subsidy: string, year: number): void {
    this.invoicesService
      .getInvoicesBySubsidy(subsidy, year)
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        tap((invoices: InvoiceModel[]) => {
          this.invoicesSubject.next(invoices);
        })
      )
      .subscribe();
  }
  // Load all invoices by years
  loadInvoicesByYears(year: number): void {
    this.invoicesService
      .getInvoicesByYear(year)
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        tap((invoices: InvoiceModel[]) => {
          this.invoicesSubject.next(invoices);
        })
      )
      .subscribe();
  }

  loadInvoiceById(id: number): void {
    this.invoicesService
      .getInvoiceById(id)
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        tap((invoice: InvoiceModel) =>
          this.selectedInvoiceSubject.next(invoice)
        ),
        catchError((err) => this.generalService.handleHttpError(err))
      )
      .subscribe();
  }

  addInvoice(invoice: FormData): Observable<InvoiceModel> {
    return this.invoicesService.add(invoice);
  }

  editInvoice(itemId: number, invoice: FormData): void {
    this.invoicesService.edit(itemId, invoice).subscribe();
  }

  deleteInvoice(id: number): void {
    this.invoicesService
      .delete(id)
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        tap(() => this.loadInvoices()),
        catchError((err) => this.generalService.handleHttpError(err))
      )
      .subscribe();
  }

  clearSelectedInvoice(): void {
    this.selectedInvoiceSubject.next(null);
  }

  // Método para aplicar filtros
  applyFilterWordTab(filterType: string | null): void {
    this.currentFilterTypeSubject.next(filterType);
    const invoices = this.invoicesSubject.getValue();
    const filtered = filterType
      ? invoices.filter((invoice) => invoice.type_invoice === filterType)
      : invoices;

    this.filteredInvoicesSubject.next(filtered);
  }

  // Método para aplicar filtro por palabras clave
  applyFilterWord(keyword: string): void {
    const invoices = this.invoicesSubject.getValue();
    const filterType = this.currentFilterTypeSubject.getValue();
    let filtered = this.invoicesSubject.getValue();

    if (filterType !== null) {
      filtered = filterType
        ? invoices.filter((invoice) => invoice.type_invoice === filterType)
        : invoices;
    }
    if (keyword) {
      keyword = keyword.toLowerCase();
      filtered = filtered.filter((invoice) =>
        Object.values(invoice).join(' ').toLowerCase().includes(keyword)
      );
    }
    this.filteredInvoicesSubject.next(filtered);
  }
}
