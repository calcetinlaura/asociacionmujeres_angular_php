import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { SubsidyModelFullData } from 'src/app/core/interfaces/subsidy.interface';
import { GeneralService } from 'src/app/core/services/generalService.service';
import { environments } from 'src/environments/environments';

@Injectable({ providedIn: 'root' })
export class SubsidiesService {
  private readonly generalService = inject(GeneralService);
  private readonly http = inject(HttpClient);
  private readonly apiUrl = `${environments.api}/backend/subsidies.php`;

  /** Estos mapas mejor en un `constants.ts`, pero los dejo aquí si ya los usas desde el servicio */

  // ───────── LISTADO ─────────
  getSubsidies(): Observable<SubsidyModelFullData[]> {
    return this.http
      .get<SubsidyModelFullData[]>(this.apiUrl)
      .pipe(catchError((err) => this.generalService.handleHttpError(err)));
  }

  getSubsidiesByType(type: string): Observable<SubsidyModelFullData[]> {
    return this.http
      .get<SubsidyModelFullData[]>(this.apiUrl, { params: { name: type } })
      .pipe(catchError((err) => this.generalService.handleHttpError(err)));
  }

  getSubsidiesByYear(year: number): Observable<SubsidyModelFullData[]> {
    return this.http
      .get<SubsidyModelFullData[]>(this.apiUrl, { params: { year } })
      .pipe(catchError((err) => this.generalService.handleHttpError(err)));
  }

  getSubsidiesByLatest(): Observable<SubsidyModelFullData[]> {
    return this.http
      .get<SubsidyModelFullData[]>(this.apiUrl, { params: { latest: true } })
      .pipe(catchError((err) => this.generalService.handleHttpError(err)));
  }

  // ───────── ITEM ─────────
  getSubsidyById(id: number): Observable<SubsidyModelFullData> {
    return this.http
      .get<SubsidyModelFullData>(`${this.apiUrl}/${id}`)
      .pipe(catchError((err) => this.generalService.handleHttpError(err)));
  }

  // ───────── CRUD ─────────
  add(subsidy: FormData): Observable<SubsidyModelFullData> {
    return this.http
      .post<SubsidyModelFullData>(this.apiUrl, subsidy)
      .pipe(catchError((err) => this.generalService.handleHttpError(err)));
  }

  edit(subsidy: FormData): Observable<SubsidyModelFullData> {
    return this.http
      .post<SubsidyModelFullData>(this.apiUrl, subsidy)
      .pipe(catchError((err) => this.generalService.handleHttpError(err)));
  }

  delete(id: number): Observable<{ ok: boolean }> {
    return this.generalService.deleteOverride<{ ok: boolean }>(this.apiUrl, {
      id,
    });
  }
}
