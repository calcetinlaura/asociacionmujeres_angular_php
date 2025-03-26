import { DestroyRef, inject, Injectable } from '@angular/core';
import { BehaviorSubject, catchError, Observable, tap, throwError } from 'rxjs';
import { CreditorsService } from '../core/services/creditors.services';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import {
  CreditorModel,
  CreditorWithInvoices,
} from '../core/interfaces/creditor.interface';
import { HttpErrorResponse } from '@angular/common/http';
import { InvoicesService } from '../core/services/invoices.services';
import { InvoiceModel } from '../core/interfaces/invoice.interface';

@Injectable({
  providedIn: 'root',
})
export class CreditorsFacade {
  private destroyRef = inject(DestroyRef);
  private creditorsService = inject(CreditorsService);
  private invoicesService = inject(InvoicesService);

  private creditorsSubject = new BehaviorSubject<CreditorWithInvoices[] | null>(
    null
  );
  private selectedCreditorSubject =
    new BehaviorSubject<CreditorWithInvoices | null>(null);

  creditors$ = this.creditorsSubject.asObservable();
  selectedCreditor$ = this.selectedCreditorSubject.asObservable();

  private invoiceCounts: Record<
    number,
    { count: number; invoiceIds: number[] }
  > = {};

  constructor() {}

  /** Cargar todos los acreedores y sus facturas */
  loadAllCreditors(): void {
    this.creditorsService
      .getCreditors()
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        tap((creditors: CreditorWithInvoices[]) => {
          this.loadInvoiceCounts(creditors);
        }),
        catchError(this.handleError)
      )
      .subscribe();
  }

  /** Cargar los datos de un acreedor por su ID */
  loadCreditorById(id: number): void {
    this.creditorsService
      .getCreditorById(id)
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        tap((creditor: CreditorWithInvoices) =>
          this.selectedCreditorSubject.next(creditor)
        ),
        catchError(this.handleError)
      )
      .subscribe();
  }

  /** Cargar el número de facturas de cada acreedor */
  loadInvoiceCounts(creditors: CreditorWithInvoices[]): void {
    this.invoicesService
      .getInvoices()
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        tap((invoices) => {
          this.invoiceCounts = this.countInvoicesByCreditor(
            invoices,
            creditors
          );
          creditors.forEach((creditor) => {
            creditor.invoices = invoices.filter(
              (inv: InvoiceModel) => inv.creditor_id === creditor.id
            );
          });
          this.assignInvoiceCountsToCreditors(creditors);
        }),
        catchError(this.handleError)
      )
      .subscribe();
  }

  /** Contar cuántas facturas tiene cada acreedor */
  private countInvoicesByCreditor(
    invoices: InvoiceModel[],
    creditors: CreditorWithInvoices[]
  ): Record<number, { count: number; invoiceIds: number[] }> {
    return invoices.reduce((acc, invoice) => {
      if (!invoice.creditor_id) return acc; // Si la factura no tiene creditorId, la ignoramos

      const creditorExists = creditors.some(
        (creditor) => creditor.id === invoice.creditor_id
      );
      if (creditorExists) {
        if (!acc[invoice.creditor_id]) {
          acc[invoice.creditor_id] = { count: 0, invoiceIds: [] };
        }
        acc[invoice.creditor_id].count++;
        acc[invoice.creditor_id].invoiceIds.push(invoice.id);
      }
      return acc;
    }, {} as Record<number, { count: number; invoiceIds: number[] }>);
  }

  /** Asignar el número de facturas a cada acreedor */
  private assignInvoiceCountsToCreditors(
    creditors: CreditorWithInvoices[]
  ): void {
    const updatedCreditors = creditors.map((creditor) => ({
      ...creditor,
      numInvoices: this.invoiceCounts[creditor.id]?.count || 0,
      invoiceIds: this.invoiceCounts[creditor.id]?.invoiceIds || [],
    }));

    if (
      JSON.stringify(updatedCreditors) !==
      JSON.stringify(this.creditorsSubject.value)
    ) {
      this.creditorsSubject.next(updatedCreditors);
    }
  }

  /** Agregar un nuevo acreedor */
  addCreditor(creditor: CreditorModel): Observable<CreditorModel> {
    return this.creditorsService.add(creditor).pipe(
      tap((newCreditor) => {
        const updatedCreditors = [
          ...(this.creditorsSubject.value || []),
          newCreditor,
        ];
        this.assignInvoiceCountsToCreditors(updatedCreditors);
      }),
      catchError(this.handleError)
    );
  }

  /** Editar un acreedor */
  editCreditor(
    itemId: number,
    creditor: CreditorModel
  ): Observable<CreditorModel> {
    return this.creditorsService.edit(itemId, creditor).pipe(
      tap((updatedCreditor) => {
        const updatedCreditors = (this.creditorsSubject.value || []).map((c) =>
          c.id === itemId ? updatedCreditor : c
        );
        this.assignInvoiceCountsToCreditors(updatedCreditors);
      }),
      catchError(this.handleError)
    );
  }

  /** Eliminar un acreedor */
  deleteCreditor(id: number): void {
    this.creditorsService
      .delete(id)
      .pipe(
        tap(() => {
          const updatedCreditors = (this.creditorsSubject.value || []).filter(
            (c) => c.id !== id
          );
          this.creditorsSubject.next(updatedCreditors);
        }),
        catchError(this.handleError)
      )
      .subscribe();
  }

  /** Limpiar acreedor seleccionado */
  clearSelectedCreditor(): void {
    this.selectedCreditorSubject.next(null);
  }

  /** Método para manejar errores */
  handleError(error: HttpErrorResponse) {
    console.error('Error en la solicitud:', error);

    return throwError(
      () =>
        new Error(
          `Hubo un problema con la solicitud. Código: ${error.status}. Mensaje: ${error.message}`
        )
    );
  }
}
