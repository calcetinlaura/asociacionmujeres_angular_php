import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { Observable, throwError } from 'rxjs';
import { catchError, map, tap } from 'rxjs/operators';
import { GeneralService } from 'src/app/core/services/generalService.service';
import { environments } from 'src/environments/environments';
import {
  InvoiceModelFullData,
  InvoicePdf,
} from '../interfaces/invoice.interface';

@Injectable({
  providedIn: 'root',
})
export class InvoicesService {
  private readonly generalService = inject(GeneralService);
  private apiUrl: string = `${environments.api}/backend/invoices.php`;
  constructor(private http: HttpClient) {}

  getInvoices(): Observable<any> {
    return this.http
      .get(this.apiUrl)
      .pipe(catchError((err) => this.generalService.handleHttpError(err)));
  }

  getInvoicesBySubsidy(subsidy: string, year: number): Observable<any> {
    return this.http
      .get(this.apiUrl, {
        params: { subsidy: subsidy, subsidy_year: year },
      })
      .pipe(catchError((err) => this.generalService.handleHttpError(err)));
  }

  getInvoicesByYear(year: number): Observable<any> {
    return this.http
      .get(this.apiUrl, {
        params: { year: year },
      })
      .pipe(catchError((err) => this.generalService.handleHttpError(err)));
  }

  getInvoicesByCategroy(category: string): Observable<any> {
    return this.http
      .get(this.apiUrl, {
        params: { category: category },
      })
      .pipe(catchError((err) => this.generalService.handleHttpError(err)));
  }

  getInvoiceById(id: number): Observable<any> {
    return this.http
      .get(`${this.apiUrl}/${id}`)
      .pipe(catchError((err) => this.generalService.handleHttpError(err)));
  }

  add(invoice: FormData): Observable<any> {
    return this.http
      .post(this.apiUrl, invoice)
      .pipe(catchError((err) => this.generalService.handleHttpError(err)));
  }

  edit(invoice: FormData): Observable<any> {
    return this.http
      .post(this.apiUrl, invoice)
      .pipe(catchError((err) => this.generalService.handleHttpError(err)));
  }

  delete(id: number): Observable<any> {
    return this.generalService.deleteOverride<any>(this.apiUrl, { id });
  }

  sortInvoicesByDate(events: InvoiceModelFullData[]): InvoiceModelFullData[] {
    return events.sort(
      (a, b) =>
        new Date(b.date_invoice).getTime() - new Date(a.date_invoice).getTime()
    );
  }
  sortInvoicesById(books: InvoiceModelFullData[]): InvoiceModelFullData[] {
    return books.sort((a, b) => b.id - a.id);
  }

  hasResults(books: InvoiceModelFullData[] | null): boolean {
    return !!books && books.length > 0;
  }

  countInvoices(books: InvoiceModelFullData[] | null): number {
    return books?.length ?? 0;
  }

  downloadFilteredPdfs(pdfFiles: string[]): Observable<Blob> {
    const url = `${environments.api}/backend/utils/zip-download.php`;

    return this.http.post(url, { files: pdfFiles }, { responseType: 'blob' });
  }

  buildInvoicePdfPaths(data: InvoicePdf[] = [], includeProof = true): string[] {
    const set = new Set<string>();

    for (const inv of data) {
      const pushPath = (fileName?: string) => {
        if (!fileName) return;
        // Intenta extraer año del nombre (YYYY_...). Si no, usa inv.year si existe.
        const m = String(fileName).match(/^(\d{4})_/);
        const year = m?.[1] ?? (inv?.year != null ? String(inv.year) : '');
        set.add(year ? `${year}/${fileName}` : `${fileName}`);
      };

      // Factura
      pushPath(inv?.invoice_pdf);
      // Justificante (opcional)
      if (includeProof) pushPath(inv?.proof_pdf);
    }

    return Array.from(set); // sin duplicados
  }

  /**
   * Construye rutas y descarga el ZIP.
   * @param data lista de facturas filtradas
   * @param options.includeProof true => invoice + proof, false => solo invoice
   * @param options.filename nombre del ZIP (por defecto según includeProof)
   */
  downloadInvoicesZipFromData(
    data: InvoicePdf[] = [],
    options?: { includeProof?: boolean; filename?: string }
  ): Observable<void> {
    const includeProof = options?.includeProof ?? true;
    const filename =
      options?.filename ?? (includeProof ? 'documentos.zip' : 'facturas.zip');

    const paths = this.buildInvoicePdfPaths(data, includeProof);
    if (!paths.length) return throwError(() => new Error('NO_FILES'));

    return this.downloadFilteredPdfs(paths).pipe(
      tap((blob) => {
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        a.remove();
        URL.revokeObjectURL(url);
      }),
      map(() => void 0),
      catchError((err) => this.generalService.handleHttpError(err))
    );
  }
}
