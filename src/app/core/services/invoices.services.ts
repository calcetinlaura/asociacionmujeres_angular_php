import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { catchError } from 'rxjs/operators';
import { Observable } from 'rxjs';
import { environments } from 'src/environments/environments';

@Injectable({
  providedIn: 'root',
})
export class InvoicesService {
  private apiUrl: string = `${environments.api}/api/invoices`;
  constructor(private http: HttpClient) {}

  getAll(): Observable<any> {
    return this.http.get(this.apiUrl).pipe(
      catchError((error: any) => {
        console.error('Error en la solicitud de FACTURAS:', error);
        throw error;
      })
    );
  }

  getAllBySubsidy(subsidy: string, year: number): Observable<any> {
    const urlWithParams = `${this.apiUrl}/subsidy`;
    return this.http
      .get(urlWithParams, {
        params: { subsidy: subsidy, subsidyYear: year },
      })
      .pipe(
        catchError((error: any) => {
          console.error(
            `Error en la solicitud de FACTURAS filtrando por años ${year}:`,
            error
          );
          throw error;
        })
      );
  }

  getAllByCategroy(category: string): Observable<any> {
    const urlWithParams = `${this.apiUrl}/category`;
    return this.http
      .get(urlWithParams, {
        params: { category: category },
      })
      .pipe(
        catchError((error: any) => {
          console.error(
            `Error en la solicitud de FACTURAS filtrando por categorías ${category}:`,
            error
          );
          throw error;
        })
      );
  }
  getAllByYear(year: number): Observable<any> {
    const urlWithParams = `${this.apiUrl}/year`;
    return this.http
      .get(urlWithParams, {
        params: { year: year },
      })
      .pipe(
        catchError((error: any) => {
          console.error(
            `Error en la solicitud de FACTURAS filtrando por años ${year}:`,
            error
          );
          throw error;
        })
      );
  }

  add(invoice: any): Observable<any> {
    return this.http.post(`${this.apiUrl}/add`, invoice).pipe(
      catchError((error: any) => {
        console.error('Error en la solicitud de FACTURAS:', error);
        throw error;
      })
    );
  }

  edit(id: number, invoice: any): Observable<any> {
    return this.http.patch(`${this.apiUrl}/edit/${id}`, invoice).pipe(
      catchError((error: any) => {
        console.error('Error en la solicitud de FACTURAS:', error);
        throw error;
      })
    );
  }

  delete(id: number): Observable<any> {
    return this.http.delete(`${this.apiUrl}/delete/${id}`).pipe(
      catchError((error: any) => {
        console.error(`Error eliminando la FACTURA con ID ${id}:`, error);
        throw error;
      })
    );
  }

  getById(id: number): Observable<any> {
    return this.http.get(`${this.apiUrl}/${id}`).pipe(
      catchError((error: any) => {
        console.error('Error en la solicitud de FACTURAS:', error);
        throw error;
      })
    );
  }
}
