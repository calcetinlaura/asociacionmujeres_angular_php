import { DestroyRef, inject, Injectable } from '@angular/core';
import { BehaviorSubject, catchError, Observable, tap, throwError } from 'rxjs';
import { InvoicesService } from '../core/services/invoices.services';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { InvoiceModel } from '../core/interfaces/invoice.interface';
import { HttpErrorResponse } from '@angular/common/http';

@Injectable({
  providedIn: 'root',
})
export class InvoicesFacade {
  private destroyRef = inject(DestroyRef);
  private invoicesService = inject(InvoicesService);

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

  constructor() {}

  // Load all invoices
  loadInvoices(): void {
    this.invoicesService
      .getInvoices()
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
          // // Aplicar el filtro actual después de cargar las facturas
          // const currentFilterType = this.currentFilterTypeSubject.getValue();
          // this.applyFilterTab(currentFilterType); // Asegúrate de aplicar el filtro actual
        })
      )
      .subscribe({
        // next: (data: InvoiceModel[]) => {
        //   let InvoicesCopy = data.map((invoice) => ({
        //     ...invoice,
        //     date_accounting: invoice.date_accounting
        //       ? new Date(invoice.date_accounting)
        //       : new Date(),
        //     date_invoice: invoice.date_invoice
        //       ? new Date(invoice.date_invoice)
        //       : new Date(),
        //   }));
        //   InvoicesCopy = InvoicesCopy.sort(
        //     (a, b) => a.date_accounting.getTime() - b.date_accounting.getTime()
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
      .getInvoiceById(id)
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        tap((invoice: InvoiceModel) =>
          this.selectedInvoiceSubject.next(invoice)
        ),
        catchError(this.handleError)
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
        catchError(this.handleError)
      )
      .subscribe();
  }

  clearSelectedInvoice(): void {
    this.selectedInvoiceSubject.next(null);
  } // Método para aplicar filtros
  applyFilterTab(filterType: string | null): void {
    this.currentFilterTypeSubject.next(filterType);
    const invoices = this.invoicesSubject.getValue();
    const filtered = filterType
      ? invoices.filter((invoice) => invoice.type_invoice === filterType)
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

  // Método para manejar errores
  handleError(error: HttpErrorResponse) {
    let errorMessage = '';

    if (error.error instanceof ErrorEvent) {
      // Error del lado del cliente o red
      errorMessage = `Error del cliente o red: ${error.error.message}`;
    } else {
      // El backend retornó un código de error no exitoso
      errorMessage = `Código de error del servidor: ${error.status}\nMensaje: ${error.message}`;
    }

    console.error(errorMessage); // Para depuración

    // Aquí podrías devolver un mensaje amigable para el usuario, o simplemente retornar el error
    return throwError(
      () =>
        new Error(
          'Hubo un problema con la solicitud, inténtelo de nuevo más tarde.'
        )
    );
  }
}
