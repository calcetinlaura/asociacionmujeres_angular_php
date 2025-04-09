import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { GeneralService } from 'src/app/shared/services/generalService.service';
import { environments } from 'src/environments/environments';

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

  edit(id: number, invoice: FormData): Observable<any> {
    return this.http
      .post(this.apiUrl, invoice)
      .pipe(catchError((err) => this.generalService.handleHttpError(err)));
  }

  delete(id: number): Observable<any> {
    return this.http
      .delete(this.apiUrl, { params: { id: id } })
      .pipe(catchError((err) => this.generalService.handleHttpError(err)));
  }
}
