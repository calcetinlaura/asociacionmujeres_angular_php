import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { GeneralService } from 'src/app/shared/services/generalService.service';
import { environments } from 'src/environments/environments';
import { SubsidyModelFullData } from '../interfaces/subsidy.interface';

@Injectable({
  providedIn: 'root',
})
export class SubsidiesService {
  private readonly generalService = inject(GeneralService);
  private apiUrl: string = `${environments.api}/backend/subsidies.php`;
  constructor(private http: HttpClient) {}

  public subsidiesMap: Record<string, string> = {
    GENERALITAT: 'Generalitat',
    DIPUTACION: 'Diputación',
    AYUNT_EQUIPAMIENTO: 'Ayunt. Equipamiento',
    AYUNT_ACTIVIDADES: 'Ayunt. Actividades',
    MINISTERIO: 'Ministerio',
  };
  public movementMap = {
    TICKET: 'Ticket',
    INVOICE: 'Factura',
    INCOME: 'Ingreso',
  };
  getSubsidies(): Observable<any> {
    return this.http
      .get(this.apiUrl)
      .pipe(catchError((err) => this.generalService.handleHttpError(err)));
  }

  getSubsidiesByType(type: string): Observable<any> {
    return this.http
      .get(this.apiUrl, {
        params: { name: type },
      })
      .pipe(catchError((err) => this.generalService.handleHttpError(err)));
  }

  getSubsidiesByYear(year: number): Observable<any> {
    return this.http
      .get(this.apiUrl, {
        params: { year: year },
      })
      .pipe(catchError((err) => this.generalService.handleHttpError(err)));
  }

  getSubsidiesByLatest(): Observable<any> {
    return this.http
      .get(this.apiUrl, { params: { latest: true } })
      .pipe(catchError((err) => this.generalService.handleHttpError(err)));
  }

  getSubsidieById(id: number): Observable<any> {
    return this.http
      .get(`${this.apiUrl}/${id}`)
      .pipe(catchError((err) => this.generalService.handleHttpError(err)));
  }

  add(subsidy: FormData): Observable<any> {
    return this.http
      .post(this.apiUrl, subsidy)
      .pipe(catchError((err) => this.generalService.handleHttpError(err)));
  }

  edit(subsidy: FormData): Observable<any> {
    return this.http
      .post(this.apiUrl, subsidy)
      .pipe(catchError((err) => this.generalService.handleHttpError(err)));
  }

  delete(id: number): Observable<any> {
    return this.generalService.deleteOverride<any>(this.apiUrl, { id });
  }

  sortSubsidiesById(subsidies: SubsidyModelFullData[]): SubsidyModelFullData[] {
    return subsidies.sort((a, b) => (b.id ?? 0) - (a.id ?? 0));
  }
  sortSubsidiesByYear(
    subsidies: SubsidyModelFullData[]
  ): SubsidyModelFullData[] {
    return subsidies.sort((a, b) => (b.year ?? 0) - (a.year ?? 0));
  }

  hasResults(recipes: SubsidyModelFullData[] | null): boolean {
    return !!recipes && recipes.length > 0;
  }

  countSubsidies(recipes: SubsidyModelFullData[] | null): number {
    return recipes?.length ?? 0;
  }
}
