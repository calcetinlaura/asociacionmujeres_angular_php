import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { catchError, shareReplay, tap } from 'rxjs/operators';
import { GeneralService } from 'src/app/shared/services/generalService.service';
import { environments } from 'src/environments/environments';
import { MacroeventModelFullData } from '../interfaces/macroevent.interface';

@Injectable({ providedIn: 'root' })
export class MacroeventsService {
  private readonly http = inject(HttpClient);
  private readonly generalService = inject(GeneralService);

  private readonly apiUrl = `${environments.api}/backend/macroevents.php`;

  // ===== CACHÉS =====
  // Listas
  private listAllReq$?: Observable<MacroeventModelFullData[]>;
  private listAllVal?: MacroeventModelFullData[];

  private listByYearReq = new Map<
    number,
    Observable<MacroeventModelFullData[]>
  >();
  private listByYearVal = new Map<number, MacroeventModelFullData[]>();

  // Detalle por id
  private macroReq = new Map<number, Observable<MacroeventModelFullData>>();
  private macroVal = new Map<number, MacroeventModelFullData>();

  // ====== QUERIES ======
  getMacroevents(): Observable<MacroeventModelFullData[]> {
    if (!this.listAllReq$) {
      this.listAllReq$ = this.http
        .get<MacroeventModelFullData[]>(this.apiUrl)
        .pipe(
          shareReplay(1),
          tap((list) => (this.listAllVal = list)),
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
          tap((list) => this.listByYearVal.set(year, list)),
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
          shareReplay(1),
          tap((m) => this.macroVal.set(id, m)),
          catchError((err) => this.generalService.handleHttpError(err))
        );
      this.macroReq.set(id, req$);
    }
    return this.macroReq.get(id)!;
  }

  // ====== COMMANDS (mutaciones) ======
  add(form: FormData): Observable<any> {
    return this.http.post(this.apiUrl, form).pipe(
      tap((created: any) => {
        // si tu backend devuelve el macro creado, podemos upsertear
        if (created?.id) {
          this.macroVal.set(created.id, created);
        }
        this.invalidateLists(); // invalida listados
      }),
      catchError((err) => this.generalService.handleHttpError(err))
    );
  }

  private invalidateItem(id: number): void {
    this.macroReq.delete(id);
    this.macroVal.delete(id);
  }

  edit(form: FormData): Observable<any> {
    return this.http.post(this.apiUrl, form).pipe(
      tap((updated: any) => {
        if (updated?.id) {
          // Puedes mantener este upsert si quieres,
          // pero lo importante es invalidar el observable cacheado:
          this.macroVal.set(updated.id, updated);
          this.invalidateItem(updated.id); // 👈 clave
        }
        this.invalidateLists();
      }),
      catchError((err) => this.generalService.handleHttpError(err))
    );
  }

  delete(id: number): Observable<any> {
    return this.generalService.deleteOverride<any>(this.apiUrl, { id }).pipe(
      tap(() => {
        this.invalidateItem(id); // 👈 clave
        this.invalidateLists();
      }),
      catchError((err) => this.generalService.handleHttpError(err))
    );
  }

  // ====== HELPERS DE ORDENACIÓN / ESTADO ======
  sortMacroeventsByTitle(
    list: MacroeventModelFullData[]
  ): MacroeventModelFullData[] {
    return [...(list ?? [])].sort((a, b) =>
      (a.title ?? '').toLowerCase().localeCompare((b.title ?? '').toLowerCase())
    );
    // se clona para no mutar caché externa
  }

  sortMacroeventsByDate(
    list: MacroeventModelFullData[]
  ): MacroeventModelFullData[] {
    return [...(list ?? [])].sort(
      (a, b) => new Date(b.start).getTime() - new Date(a.start).getTime()
    );
  }

  sortMacroeventsById(
    list: MacroeventModelFullData[]
  ): MacroeventModelFullData[] {
    return [...(list ?? [])].sort((a, b) => (b.id ?? 0) - (a.id ?? 0));
  }

  hasResults(list: MacroeventModelFullData[] | null): boolean {
    return !!list && list.length > 0;
  }

  countMacroevents(list: MacroeventModelFullData[] | null): number {
    return list?.length ?? 0;
  }

  // ====== CACHE MGMT ======
  /** Invalida los listados (all + por año) para forzar recarga en la próxima suscripción */
  private invalidateLists(): void {
    this.listAllReq$ = undefined;
    this.listAllVal = undefined;

    this.listByYearReq.clear();
    this.listByYearVal.clear();
  }

  /** Limpia toda la caché (items + listas) */
  clearCache(): void {
    this.invalidateLists();
    this.macroReq.clear();
    this.macroVal.clear();
  }
}
