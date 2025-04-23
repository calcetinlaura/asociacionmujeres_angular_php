import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { GeneralService } from 'src/app/shared/services/generalService.service';
import { environments } from 'src/environments/environments';
import { MacroeventModelFullData } from '../interfaces/macroevent.interface';

@Injectable({
  providedIn: 'root',
})
export class MacroeventsService {
  private readonly generalService = inject(GeneralService);
  private apiUrl: string = `${environments.api}/backend/macroevents.php`;
  constructor(private http: HttpClient) {}

  getMacroevents(): Observable<any> {
    return this.http
      .get(this.apiUrl)
      .pipe(catchError((err) => this.generalService.handleHttpError(err)));
  }
  getMacroeventsByYear(year: number): Observable<any> {
    return this.http
      .get(this.apiUrl, { params: { year: year } })
      .pipe(catchError((err) => this.generalService.handleHttpError(err)));
  }

  getMacroeventById(id: number): Observable<any> {
    return this.http
      .get(`${this.apiUrl}/${id}`)
      .pipe(catchError((err) => this.generalService.handleHttpError(err)));
  }

  add(event: FormData): Observable<any> {
    return this.http
      .post(this.apiUrl, event)
      .pipe(catchError((err) => this.generalService.handleHttpError(err)));
  }

  edit(id: number, event: FormData): Observable<any> {
    return this.http
      .post(this.apiUrl, event)
      .pipe(catchError((err) => this.generalService.handleHttpError(err)));
  }

  delete(id: number): Observable<any> {
    return this.http
      .delete(this.apiUrl, { params: { id: id } })
      .pipe(catchError((err) => this.generalService.handleHttpError(err)));
  }

  sortMacroeventsByTitle(
    macroevents: MacroeventModelFullData[]
  ): MacroeventModelFullData[] {
    return macroevents.sort((a, b) =>
      a.title.toLowerCase().localeCompare(b.title.toLowerCase())
    );
  }

  sortMacroeventsByDate(
    macroevents: MacroeventModelFullData[]
  ): MacroeventModelFullData[] {
    return macroevents.sort(
      (a, b) => new Date(b.start).getTime() - new Date(a.start).getTime()
    );
  }

  sortMacroeventsById(
    macroevents: MacroeventModelFullData[]
  ): MacroeventModelFullData[] {
    return macroevents.sort((a, b) => b.id - a.id);
  }

  hasResults(macroevents: MacroeventModelFullData[] | null): boolean {
    return !!macroevents && macroevents.length > 0;
  }

  countMacroevents(macroevents: MacroeventModelFullData[] | null): number {
    return macroevents?.length ?? 0;
  }
}
