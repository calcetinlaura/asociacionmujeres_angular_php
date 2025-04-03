import { Injectable } from '@angular/core';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { catchError } from 'rxjs/operators';
import { Observable, throwError } from 'rxjs';
import { environments } from 'src/environments/environments';
import { PartnerModel } from 'src/app/core/interfaces/partner.interface';

@Injectable({
  providedIn: 'root',
})
export class PartnersService {
  private apiUrl: string = `${environments.api}/backend/partners.php`;
  constructor(private http: HttpClient) {}

  getPartners(): Observable<any> {
    return this.http.get(this.apiUrl).pipe(catchError(this.handleError));
  }

  getPartnersByYear(year: number): Observable<any> {
    return this.http
      .get(this.apiUrl, { params: { year: year } })
      .pipe(catchError(this.handleError));
  }

  getPartnerById(id: number): Observable<any> {
    return this.http
      .get(this.apiUrl, { params: { id: id } })
      .pipe(catchError(this.handleError));
  }

  add(partner: FormData): Observable<any> {
    return this.http
      .post(this.apiUrl, partner)
      .pipe(catchError(this.handleError));
  }

  edit(id: number, partner: FormData): Observable<any> {
    return this.http
      .post(this.apiUrl, partner)
      .pipe(catchError(this.handleError));
  }

  delete(id: number): Observable<any> {
    return this.http
      .delete(`${this.apiUrl}?id=${id}`) // 🔹 Ahora el id se pasa como parámetro en la URL
      .pipe(catchError(this.handleError));
  }

  sortPartnersByName(partners: PartnerModel[]): PartnerModel[] {
    return partners.sort((a, b) =>
      a.name.toLowerCase().localeCompare(b.name.toLowerCase())
    );
  }

  sortPartnersById(partners: PartnerModel[]): PartnerModel[] {
    return partners.sort((a, b) => b.id - a.id);
  }

  hasResults(partners: PartnerModel[] | null): boolean {
    return !!partners && partners.length > 0;
  }

  countPartners(partners: PartnerModel[] | null): number {
    return partners?.length ?? 0;
  }

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
