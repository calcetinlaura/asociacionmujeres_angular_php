import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { GeneralService } from 'src/app/core/services/generalService.service';
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
}
