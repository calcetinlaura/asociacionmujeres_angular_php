import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { GeneralService } from 'src/app/core/services/generalService.service';
import { environments } from 'src/environments/environments';

@Injectable({ providedIn: 'root' })
export class InvoicesService {
  private readonly generalService = inject(GeneralService);
  private readonly http = inject(HttpClient);
  private readonly apiUrl = `${environments.api}/backend/invoices.php`;
  private readonly zipUrl = `${environments.api}/backend/utils/zip-download.php`;

  // ───────────── LISTADO ─────────────
  getInvoices(): Observable<any> {
    return this.http
      .get(this.apiUrl)
      .pipe(catchError((err) => this.generalService.handleHttpError(err)));
  }

  getInvoicesByYear(year: number): Observable<any> {
    return this.http
      .get(this.apiUrl, { params: { year } })
      .pipe(catchError((err) => this.generalService.handleHttpError(err)));
  }

  getInvoicesBySubsidy(subsidy: string, year: number): Observable<any> {
    return this.http
      .get(this.apiUrl, { params: { subsidy, subsidy_year: year } })
      .pipe(catchError((err) => this.generalService.handleHttpError(err)));
  }

  getInvoicesByCategory(category: string): Observable<any> {
    return this.http
      .get(this.apiUrl, { params: { category } })
      .pipe(catchError((err) => this.generalService.handleHttpError(err)));
  }

  // ───────────── ITEM ─────────────
  getInvoiceById(id: number): Observable<any> {
    return this.http
      .get(`${this.apiUrl}/${id}`)
      .pipe(catchError((err) => this.generalService.handleHttpError(err)));
  }

  // ───────────── CRUD ─────────────
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

  // ───────────── ZIP ─────────────
  downloadFilteredPdfs(pdfFiles: string[]): Observable<Blob> {
    return this.http.post(
      this.zipUrl,
      { files: pdfFiles },
      { responseType: 'blob' }
    );
  }
}
