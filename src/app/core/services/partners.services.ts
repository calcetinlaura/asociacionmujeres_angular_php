import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { PartnerModel } from 'src/app/core/interfaces/partner.interface';
import { GeneralService } from 'src/app/shared/services/generalService.service';
import { environments } from 'src/environments/environments';

@Injectable({
  providedIn: 'root',
})
export class PartnersService {
  private readonly generalService = inject(GeneralService);
  private apiUrl: string = `${environments.api}/backend/partners.php`;
  constructor(private http: HttpClient) {}

  getPartners(): Observable<any> {
    return this.http
      .get(this.apiUrl)
      .pipe(catchError((err) => this.generalService.handleHttpError(err)));
  }

  getPartnersByYear(year: number): Observable<any> {
    return this.http
      .get(this.apiUrl, { params: { year: year } })
      .pipe(catchError((err) => this.generalService.handleHttpError(err)));
  }

  getPartnerById(id: number): Observable<any> {
    return this.http
      .get(this.apiUrl, { params: { id: id } })
      .pipe(catchError((err) => this.generalService.handleHttpError(err)));
  }

  add(partner: FormData): Observable<any> {
    return this.http
      .post(this.apiUrl, partner)
      .pipe(catchError((err) => this.generalService.handleHttpError(err)));
  }

  edit(id: number, partner: FormData): Observable<any> {
    return this.http
      .post(this.apiUrl, partner)
      .pipe(catchError((err) => this.generalService.handleHttpError(err)));
  }

  delete(id: number): Observable<any> {
    return this.http
      .delete(`${this.apiUrl}?id=${id}`) // 🔹 Ahora el id se pasa como parámetro en la URL
      .pipe(catchError((err) => this.generalService.handleHttpError(err)));
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
}
