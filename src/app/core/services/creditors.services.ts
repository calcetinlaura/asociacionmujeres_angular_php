import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { catchError } from 'rxjs/operators';
import {
  CreditorModel,
  CreditorWithInvoices,
} from 'src/app/core/interfaces/creditor.interface';
import { GeneralService } from 'src/app/core/services/generalService.service';
import { environments } from 'src/environments/environments';

@Injectable({
  providedIn: 'root',
})
export class CreditorsService {
  private readonly generalService = inject(GeneralService);
  private readonly http = inject(HttpClient);
  private readonly apiUrl = `${environments.api}/backend/creditors.php`;

  // ─────────── GETTERS ───────────
  getCreditors(): Observable<CreditorWithInvoices[]> {
    console.log('📡 Llamando a:', this.apiUrl);
    return this.http
      .get<CreditorWithInvoices[]>(this.apiUrl)
      .pipe(catchError((err) => this.generalService.handleHttpError(err)));
  }
  getCreditorsByCategory(category: string): Observable<CreditorWithInvoices[]> {
    return this.http
      .get<CreditorWithInvoices[]>(this.apiUrl, { params: { category } })
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

  // ─────────── AUTOCOMPLETE ───────────
  getSuggestions(query: string): Observable<CreditorModel[]> {
    return this.http
      .get<CreditorModel[]>(`${this.apiUrl}?q=${query}&_limit=6`)
      .pipe(catchError((err) => this.generalService.handleHttpError(err)));
  }
}
