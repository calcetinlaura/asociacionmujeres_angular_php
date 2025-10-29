import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { catchError, shareReplay, tap } from 'rxjs/operators';
import { GeneralService } from 'src/app/core/services/generalService.service';
import { environments } from 'src/environments/environments';
import { MacroeventModelFullData } from '../interfaces/macroevent.interface';

@Injectable({ providedIn: 'root' })
export class MacroeventsService {
  private readonly http = inject(HttpClient);
  private readonly generalService = inject(GeneralService);

  private readonly apiUrl = `${environments.api}/backend/macroevents.php`;
  // ──────────────── CACHÉ ────────────────
  private listAllReq$?: Observable<MacroeventModelFullData[]>;
  private listByYearReq = new Map<
    number,
    Observable<MacroeventModelFullData[]>
  >();
  private macroReq = new Map<number, Observable<MacroeventModelFullData>>();

  // ──────────────── QUERIES ────────────────
  getMacroevents(): Observable<MacroeventModelFullData[]> {
    if (!this.listAllReq$) {
      this.listAllReq$ = this.http
        .get<MacroeventModelFullData[]>(this.apiUrl)
        .pipe(
          shareReplay(1),
          catchError((err) => this.generalService.handleHttpError(err))
        );
    }
    return this.listAllReq$;
  }

  getMacroeventsByYear(year: number): Observable<MacroeventModelFullData[]> {
    if (!this.listByYearReq.has(year)) {
      const req$ = this.http
        .get<MacroeventModelFullData[]>(this.apiUrl, {
          params: { year } as any,
        })
        .pipe(
          shareReplay(1),
          catchError((err) => this.generalService.handleHttpError(err))
        );
      this.listByYearReq.set(year, req$);
    }
    return this.listByYearReq.get(year)!;
  }

  getMacroeventById(id: number): Observable<MacroeventModelFullData> {
    if (!this.macroReq.has(id)) {
      const req$ = this.http
        .get<MacroeventModelFullData>(`${this.apiUrl}/${id}`)
        .pipe(
          shareReplay({ bufferSize: 1, refCount: false }),
          catchError((err) => this.generalService.handleHttpError(err))
        );
      this.macroReq.set(id, req$);
    }
    return this.macroReq.get(id)!;
  }

  getMacroeventByIdOnce(id: number): Observable<MacroeventModelFullData> {
    return this.http
      .get<MacroeventModelFullData>(`${this.apiUrl}/${id}`)
      .pipe(catchError((err) => this.generalService.handleHttpError(err)));
  }

  // ──────────────── MUTACIONES ────────────────
  add(form: FormData): Observable<MacroeventModelFullData> {
    return this.http.post<MacroeventModelFullData>(this.apiUrl, form).pipe(
      tap(() => this.invalidateLists()),
      catchError((err) => this.generalService.handleHttpError(err))
    );
  }

  edit(form: FormData): Observable<MacroeventModelFullData> {
    return this.http.post<MacroeventModelFullData>(this.apiUrl, form).pipe(
      tap((updated) => this.invalidateItem(updated.id ?? 0)),
      tap(() => this.invalidateLists()),
      catchError((err) => this.generalService.handleHttpError(err))
    );
  }

  delete(id: number): Observable<any> {
    return this.generalService.deleteOverride<any>(this.apiUrl, { id }).pipe(
      tap(() => {
        this.invalidateItem(id);
        this.invalidateLists();
      }),
      catchError((err) => this.generalService.handleHttpError(err))
    );
  }

  // ──────────────── CACHE MGMT ────────────────
  private invalidateItem(id: number): void {
    this.macroReq.delete(id);
  }

  private invalidateLists(): void {
    this.listAllReq$ = undefined;
    this.listByYearReq.clear();
  }

  clearCache(): void {
    this.invalidateLists();
    this.macroReq.clear();
  }
}
