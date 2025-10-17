import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { EMPTY, Observable } from 'rxjs';
import { catchError, shareReplay, take, tap } from 'rxjs/operators';
import {
  EventModel,
  EventModelFullData,
} from 'src/app/core/interfaces/event.interface';
import { GeneralService } from 'src/app/shared/services/generalService.service';
import { environments } from 'src/environments/environments';
import { AgentEventsQuery } from '../interfaces/agent.interface';

@Injectable({ providedIn: 'root' })
export class EventsService {
  private readonly generalService = inject(GeneralService);
  private readonly http = inject(HttpClient);
  private readonly apiUrl = `${environments.api}/backend/events.php`;

  // ====== CACHES ======

  // 🔁 getEventById: caché con TTL (dedupe)
  private readonly CACHE_TTL_MS = 5 * 60 * 1000; // 5 min
  private eventByIdCache = new Map<
    number,
    { expiresAt: number; value$: Observable<EventModelFullData> }
  >();

  // 📦 Eventos por macro: caché en memoria (request + valor materializado)
  private byMacroReq = new Map<number, Observable<EventModel[]>>();
  private byMacroVal = new Map<number, EventModel[]>();

  // ====== GETs ======

  getEvents(): Observable<EventModel[]> {
    return this.http
      .get<EventModel[]>(this.apiUrl)
      .pipe(catchError((err) => this.generalService.handleHttpError(err)));
  }

  getEventsByYear(
    year: number,
    periodic: 'all' | 'latest' = 'all'
  ): Observable<EventModel[]> {
    return this.http
      .get<EventModel[]>(this.apiUrl, {
        params: { year: String(year), periodic },
      })
      .pipe(catchError((err) => this.generalService.handleHttpError(err)));
  }

  /**
   * ✅ getEventsByMacroevent con memoización (shareReplay) + cache de valor
   * - No repite request si ya hay una en curso
   * - Deja "peek" disponible para abrir modal al instante
   */
  getEventsByMacroevent(macroeventId: number): Observable<EventModel[]> {
    if (!this.byMacroReq.has(macroeventId)) {
      const req$ = this.http
        .get<EventModel[]>(this.apiUrl, {
          params: { macroevent_id: String(macroeventId) },
        })
        .pipe(
          shareReplay({ bufferSize: 1, refCount: false }),
          tap((list) => this.byMacroVal.set(macroeventId, list)),
          catchError((err) => this.generalService.handleHttpError(err))
        );
      this.byMacroReq.set(macroeventId, req$);
    }
    return this.byMacroReq.get(macroeventId)!;
  }

  /** 🔮 Dispara la carga en segundo plano para que llegue caliente a la modal */
  prefetchEventsByMacro(macroeventId: number, _ttlMs?: number): void {
    this.getEventsByMacroevent(macroeventId)
      .pipe(take(1))
      .subscribe({
        next: () => {},
        error: () => {},
      });
  }

  /** 👀 Lee sincronamente si ya tenemos lista en memoria (para abrir modal ya) */
  peekEventsByMacro(macroeventId: number): EventModel[] | null {
    return this.byMacroVal.get(macroeventId) ?? null;
  }

  /** ❌ Invalidar caché por macro (llámalo tras altas/bajas/ediciones si procede) */
  invalidateEventsByMacro(macroeventId: number): void {
    this.byMacroReq.delete(macroeventId);
    this.byMacroVal.delete(macroeventId);
  }

  getEventsByAgent(
    agentId: number,
    opts: AgentEventsQuery = {}
  ): Observable<EventModel[]> {
    const params: Record<string, string> = { agent_id: String(agentId) };
    if (opts.role) params['role'] = opts.role;
    if (opts.year) params['year'] = String(opts.year);
    if (opts.order) params['order'] = opts.order;

    return this.http
      .get<EventModel[]>(this.apiUrl, { params })
      .pipe(catchError((err) => this.generalService.handleHttpError(err)));
  }

  getEventsByProject(projectId: number): Observable<EventModel[]> {
    return this.http
      .get<EventModel[]>(this.apiUrl, {
        params: { project_id: String(projectId) },
      })
      .pipe(catchError((err) => this.generalService.handleHttpError(err)));
  }

  /**
   * 🏎️ getEventById con caché + TTL + dedupe
   */

  getEventById(id: number): Observable<any> {
    return this.http
      .get(`${this.apiUrl}/${id}`)
      .pipe(catchError((err) => this.generalService.handleHttpError(err)));
  }

  prefetchEventById(id: number): void {
    this.getEventById(id)
      .pipe(
        take(1),
        catchError(() => EMPTY)
      )
      .subscribe();
  }

  getEventsByPeriodicId(periodicId: string): Observable<EventModel[]> {
    return this.http
      .get<EventModel[]>(this.apiUrl, { params: { periodic_id: periodicId } })
      .pipe(catchError((err) => this.generalService.handleHttpError(err)));
  }

  // ====== POST/PUT ======

  add(event: FormData): Observable<any> {
    return this.http
      .post(this.apiUrl, event)
      .pipe(catchError((err) => this.generalService.handleHttpError(err)));
  }

  edit(event: FormData): Observable<any> {
    return this.http
      .post(this.apiUrl, event)
      .pipe(catchError((err) => this.generalService.handleHttpError(err)));
  }

  updateEvent(id: number, formData: FormData): Observable<any> {
    return this.http
      .post(`${this.apiUrl}?id=${id}`, formData)
      .pipe(catchError((err) => this.generalService.handleHttpError(err)));
  }

  // ====== DELETE ======

  delete(id: number): Observable<any> {
    return this.generalService
      .deleteOverride<any>(this.apiUrl, { id })
      .pipe(catchError((err) => this.generalService.handleHttpError(err)));
  }

  /** Unificación de borrados por periodic_id */
  deleteByPeriodicId(periodicId: string, keepId?: number): Observable<void> {
    const payload: Record<string, string | number> = {
      periodic_id: periodicId,
    };
    if (typeof keepId === 'number') payload['keep_id'] = keepId;
    return this.generalService.deleteOverride<void>(this.apiUrl, payload);
  }

  // Back-compat
  deleteEventsByPeriodicId(periodicId: string): Observable<void> {
    return this.deleteByPeriodicId(periodicId);
  }
  deleteOtherEventsByPeriodicId(
    periodicId: string,
    keepId: number
  ): Observable<void> {
    return this.deleteByPeriodicId(periodicId, keepId);
  }
  deleteEventsByPeriodicIdExcept(
    periodicId: string,
    keepId: number
  ): Observable<void> {
    return this.deleteByPeriodicId(periodicId, keepId);
  }

  // ====== Utils ======

  sortEventsByTitle<T extends { title: string }>(events: T[]): T[] {
    return [...events].sort((a, b) =>
      a.title.toLowerCase().localeCompare(b.title.toLowerCase())
    );
  }

  sortEventsByDate<T extends { start: string }>(events: T[]): T[] {
    return [...events].sort(
      (a, b) => new Date(b.start).getTime() - new Date(a.start).getTime()
    );
  }

  sortEventsById<T extends { id: number }>(events: T[]): T[] {
    return [...events].sort((a, b) => b.id - a.id);
  }

  hasResults(events: EventModelFullData[] | null): boolean {
    return !!events && events.length > 0;
  }

  countEvents(events: EventModelFullData[] | null): number {
    return events?.length ?? 0;
  }
}
