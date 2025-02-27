import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { catchError } from 'rxjs/operators';
import { Observable } from 'rxjs';
import { environments } from 'src/environments/environments';
import { CreditorModel } from '../interfaces/creditor.interface';

@Injectable({
  providedIn: 'root',
})
export class CreditorsService {
  private apiUrl: string = `${environments.api}/api/creditors`;
  constructor(private http: HttpClient) {}

  getAll(): Observable<any> {
    return this.http.get(this.apiUrl).pipe(
      catchError((error: any) => {
        console.error('Error en la solicitud de SOCIAS:', error);
        throw error;
      })
    );
  }
  add(creditor: any): Observable<any> {
    return this.http.post(`${this.apiUrl}/add`, creditor).pipe(
      catchError((error: any) => {
        console.error('Error en la solicitud de ACREEDOR:', error);
        throw error;
      })
    );
  }

  edit(id: number, creditor: any): Observable<any> {
    return this.http.patch(`${this.apiUrl}/edit/${id}`, creditor).pipe(
      catchError((error: any) => {
        console.error('Error en la solicitud de ACREEDOR:', error);
        throw error;
      })
    );
  }

  delete(id: number): Observable<any> {
    return this.http.delete(`${this.apiUrl}/delete/${id}`).pipe(
      catchError((error: any) => {
        console.error('Error en la solicitud de ACREEDOR:', error);
        throw error;
      })
    );
  }

  getById(id: number): Observable<any> {
    return this.http.get(`${this.apiUrl}/${id}`).pipe(
      catchError((error: any) => {
        console.error('Error en la solicitud de ACREEDOR:', error);
        throw error;
      })
    );
  }
  //Autocomplete de factura
  getSuggestions(query: string): Observable<CreditorModel[]> {
    return this.http
      .get<CreditorModel[]>(`${this.apiUrl}?q=${query}&_limit=6`)
      .pipe(
        catchError((error: any) => {
          console.error('Error en la solicitud de ACREEDORES:', error);
          throw error;
        })
      );
  }
}
