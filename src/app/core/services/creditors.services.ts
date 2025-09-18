import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { catchError } from 'rxjs/operators';
import {
  CreditorModel,
  CreditorWithInvoices,
} from 'src/app/core/interfaces/creditor.interface';
import { GeneralService } from 'src/app/shared/services/generalService.service';
import { environments } from 'src/environments/environments';

@Injectable({
  providedIn: 'root',
})
export class CreditorsService {
  private readonly generalService = inject(GeneralService);
  private apiUrl: string = `${environments.api}/backend/creditors.php`;
  constructor(private http: HttpClient) {}

  getCreditors(): Observable<any> {
    return this.http
      .get(this.apiUrl)
      .pipe(catchError((err) => this.generalService.handleHttpError(err)));
  }

  getCreditorsByCategory(category: string): Observable<any> {
    return this.http
      .get(this.apiUrl, { params: { category: category } })
      .pipe(catchError((err) => this.generalService.handleHttpError(err)));
  }

  getCreditorById(id: number): Observable<any> {
    return (
      this.http
        // .get(`${this.apiUrl}/${id}`)
        .get(this.apiUrl, { params: { id: id } })
        .pipe(catchError((err) => this.generalService.handleHttpError(err)))
    );
  }

  add(creditor: FormData): Observable<any> {
    return this.http
      .post(this.apiUrl, creditor)
      .pipe(catchError((err) => this.generalService.handleHttpError(err)));
  }

  edit(creditor: FormData): Observable<any> {
    return this.http
      .post(this.apiUrl, creditor)
      .pipe(catchError((err) => this.generalService.handleHttpError(err)));
  }

  delete(id: number): Observable<any> {
    return this.generalService.deleteOverride<any>(this.apiUrl, { id });
  }

  //Autocomplete de factura
  getSuggestions(query: string): Observable<CreditorModel[]> {
    return this.http
      .get<CreditorModel[]>(`${this.apiUrl}?q=${query}&_limit=6`)
      .pipe(catchError((err) => this.generalService.handleHttpError(err)));
  }

  sortCreditorsByCompany(creditors: CreditorModel[]): CreditorModel[] {
    return creditors.sort((a, b) =>
      a.company
        .toLowerCase()
        .localeCompare(b.company.toLowerCase(), undefined, {
          sensitivity: 'base',
        })
    );
  }

  sortCreditorsById(creditors: CreditorWithInvoices[]): CreditorWithInvoices[] {
    return creditors.sort((a, b) => b.id - a.id);
  }

  hasResults(creditors: CreditorWithInvoices[] | null): boolean {
    return !!creditors && creditors.length > 0;
  }

  countCreditors(creditors: CreditorWithInvoices[] | null): number {
    return creditors?.length ?? 0;
  }
}
