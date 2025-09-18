import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { PiteraModel } from 'src/app/core/interfaces/pitera.interface';
import { GeneralService } from 'src/app/shared/services/generalService.service';
import { environments } from 'src/environments/environments';

@Injectable({
  providedIn: 'root',
})
export class PiterasService {
  private readonly generalService = inject(GeneralService);
  private apiUrl: string = `${environments.api}/backend/piteras.php`;
  constructor(private http: HttpClient) {}

  getPiteras(): Observable<any> {
    return this.http
      .get(this.apiUrl)
      .pipe(catchError((err) => this.generalService.handleHttpError(err)));
  }

  getPiteraById(id: number): Observable<any> {
    return this.http
      .get(`${this.apiUrl}/${id}`)
      .pipe(catchError((err) => this.generalService.handleHttpError(err)));
  }

  add(pitera: FormData): Observable<any> {
    return this.http
      .post(this.apiUrl, pitera)
      .pipe(catchError((err) => this.generalService.handleHttpError(err)));
  }

  edit(pitera: FormData): Observable<any> {
    return this.http
      .post(this.apiUrl, pitera)
      .pipe(catchError((err) => this.generalService.handleHttpError(err)));
  }

  delete(id: number): Observable<any> {
    return this.generalService.deleteOverride<any>(this.apiUrl, { id });
  }

  sortPiterasByYear(piteras: PiteraModel[]): PiteraModel[] {
    return piteras.sort((a, b) => Number(b.year) - Number(a.year));
  }

  sortPiterasById(piteras: PiteraModel[]): PiteraModel[] {
    return piteras.sort((a, b) => b.id - a.id);
  }

  hasResults(piteras: PiteraModel[] | null): boolean {
    return !!piteras && piteras.length > 0;
  }

  countPiteras(piteras: PiteraModel[] | null): number {
    return piteras?.length ?? 0;
  }
}
