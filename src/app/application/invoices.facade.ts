import { DestroyRef, inject, Injectable } from '@angular/core';
import { BehaviorSubject, Observable, tap } from 'rxjs';
import { InvoicesService } from '../core/services/invoices.services';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { InvoiceModel } from '../core/interfaces/invoice.interface';

@Injectable({
  providedIn: 'root',
})
export class InvoicesFacade {
  private destroyRef = inject(DestroyRef);

  // Subjects to manage the state of invoices and current selected invoice
  private invoicesSubject = new BehaviorSubject<InvoiceModel[]>([]);
  private selectedInvoiceSubject = new BehaviorSubject<InvoiceModel | null>(
    null
  );
  private filteredInvoicesByYearSubject = new BehaviorSubject<InvoiceModel[]>(
    []
  );
  private filteredInvoicesSubject = new BehaviorSubject<InvoiceModel[] | null>(
    null
  );
  private currentFilterTypeSubject = new BehaviorSubject<string | null>(null);

  invoices$ = this.invoicesSubject.asObservable();
  selectedInvoice$ = this.selectedInvoiceSubject.asObservable();
  filteredInvoicesByYear$ = this.filteredInvoicesByYearSubject.asObservable();
  filteredInvoices$ = this.filteredInvoicesSubject.asObservable();
  currentFilterType$ = this.currentFilterTypeSubject.asObservable();

  constructor(private invoicesService: InvoicesService) {}

  // Método para aplicar filtros
  applyFilterTab(filterType: string | null): void {
    this.currentFilterTypeSubject.next(filterType);
    const invoices = this.invoicesSubject.getValue();
    const filtered = filterType
      ? invoices.filter((invoice) => invoice.typeInvoice === filterType)
      : invoices;

    this.filteredInvoicesSubject.next(filtered);
  }

  // Método para aplicar filtro por palabras clave
  applyFiltersWords(keyword: string): void {
    const invoices = this.invoicesSubject.getValue();
    const filterType = this.currentFilterTypeSubject.getValue();
    let filtered = this.invoicesSubject.getValue();

    if (filterType !== null) {
      filtered = filterType
        ? invoices.filter((invoice) => invoice.typeInvoice === filterType)
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

  // Load all invoices
  loadInvoices(): void {
    this.invoicesService
      .getAll()
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        tap((invoices: InvoiceModel[]) => {
          this.invoicesSubject.next(invoices);
          // Aplicar el filtro actual después de cargar las facturas
          const currentFilterType = this.currentFilterTypeSubject.getValue();
          this.applyFilterTab(currentFilterType); // Asegúrate de aplicar el filtro actual
        })
      )
      .subscribe();
  }

  loadInvoicesBySubsidy(subsidy: string, year: number): void {
    this.invoicesService
      .getAllBySubsidy(subsidy, year)
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        tap((invoices: InvoiceModel[]) => {
          this.invoicesSubject.next(invoices);
        })
      )
      .subscribe();
  }
  // Load all invoices by years
  loadInvoicesByYears(filter: string): void {
    this.invoicesService
      .getAllByYear(parseInt(filter))
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        tap((invoices: InvoiceModel[]) => {
          this.invoicesSubject.next(invoices);
          // // Aplicar el filtro actual después de cargar las facturas
          // const currentFilterType = this.currentFilterTypeSubject.getValue();
          // this.applyFilterTab(currentFilterType); // Asegúrate de aplicar el filtro actual
        })
      )
      .subscribe({
        // next: (data: InvoiceModel[]) => {
        //   let InvoicesCopy = data.map((invoice) => ({
        //     ...invoice,
        //     dateAccounting: invoice.dateAccounting
        //       ? new Date(invoice.dateAccounting)
        //       : new Date(),
        //     dateInvoice: invoice.dateInvoice
        //       ? new Date(invoice.dateInvoice)
        //       : new Date(),
        //   }));
        //   InvoicesCopy = InvoicesCopy.sort(
        //     (a, b) => a.dateAccounting.getTime() - b.dateAccounting.getTime()
        //   );
        //   this.filteredInvoicesByYearSubject.next(
        //     InvoicesCopy.map((invoice) => ({
        //       ...invoice,
        //     }))
        //   );
        // },
        // error: (error) => {
        //   console.error(
        //     `Error al recuperar facturas filtrando por años ${filter}`,
        //     error
        //   );
        // },
        // complete: () => {},
      });
  }
  // Load a specific invoice by ID
  loadInvoiceById(id: number): void {
    this.invoicesService
      .getById(id)
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        tap((invoice: InvoiceModel) =>
          this.selectedInvoiceSubject.next(invoice)
        )
      )
      .subscribe();
  }

  // Add a new invoice
  addInvoice(invoice: InvoiceModel): Observable<InvoiceModel> {
    return this.invoicesService.add(invoice);
  }

  // Edit a invoice
  editInvoice(itemId: number, invoice: InvoiceModel): void {
    this.invoicesService.edit(itemId, invoice).subscribe();
  }

  // Delete a invoice
  deleteInvoice(id: number): void {
    this.invoicesService
      .delete(id)
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        tap(() => this.loadInvoices())
      )
      .subscribe();
  }

  // Clear selected invoice
  clearSelectedInvoice(): void {
    this.selectedInvoiceSubject.next(null);
  }
}
