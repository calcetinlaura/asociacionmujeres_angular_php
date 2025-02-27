import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { catchError } from 'rxjs/operators';
import { Observable } from 'rxjs';
import { environments } from 'src/environments/environments';

@Injectable({
  providedIn: 'root',
})
export class PartnersService {
  private apiUrl: string = `${environments.api}/api/partners`;
  constructor(private http: HttpClient) {}

  getAll(): Observable<any> {
    return this.http.get(this.apiUrl).pipe(
      catchError((error: any) => {
        console.error('Error en la solicitud de SOCIAS:', error);
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
            `Error en la solicitud de SOCIAS filtrando por ${year} cuota: `,
            error
          );
          throw error;
        })
      );
  }

  add(partner: any): Observable<any> {
    return this.http.post(`${this.apiUrl}/add`, partner).pipe(
      catchError((error: any) => {
        console.error('Error en la solicitud de SOCIAS:', error);
        throw error;
      })
    );
  }

  edit(id: number, partner: any): Observable<any> {
    return this.http.patch(`${this.apiUrl}/edit/${id}`, partner).pipe(
      catchError((error: any) => {
        console.error('Error en la solicitud de SOCIAS:', error);
        throw error;
      })
    );
  }

  delete(id: number): Observable<any> {
    return this.http.delete(`${this.apiUrl}/delete/${id}`).pipe(
      catchError((error: any) => {
        console.error('Error en la solicitud de SOCIAS:', error);
        throw error;
      })
    );
  }

  getById(id: number): Observable<any> {
    return this.http.get(`${this.apiUrl}/${id}`).pipe(
      catchError((error: any) => {
        console.error('Error en la solicitud de SOCIAS:', error);
        throw error;
      })
    );
  }
}
