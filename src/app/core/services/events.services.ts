import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { catchError } from 'rxjs/operators';
import {
  EventModel,
  EventModelFullData,
} from 'src/app/core/interfaces/event.interface';
import { GeneralService } from 'src/app/shared/services/generalService.service';
import { environments } from 'src/environments/environments';
import { AgentEventsQuery } from '../interfaces/agent.interface';

// RxJS extras para caché/operadores
import { shareReplay, take } from 'rxjs/operators';

@Injectable({
  providedIn: 'root',
})
export class EventsService {
  private readonly generalService = inject(GeneralService);
  private apiUrl: string = `${environments.api}/backend/events.php`;

  // 🧠 Caché por id con TTL
  private readonly CACHE_TTL_MS = 5 * 60 * 1000; // 5 min
  private eventByIdCache = new Map<
    number,
    { expiresAt: number; value$: Observable<EventModelFullData> }
  >();

  constructor(private http: HttpClient) {}

  // ---------- GETs ----------
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
        params: {
          year: year.toString(),
          periodic: periodic,
        },
      })
      .pipe(catchError((err) => this.generalService.handleHttpError(err)));
  }

  getEventsByMacroevent(macroeventId: number): Observable<EventModel[]> {
    return this.http
      .get<EventModel[]>(this.apiUrl, {
        params: { macroevent_id: String(macroeventId) },
      })
      .pipe(catchError((err) => this.generalService.handleHttpError(err)));
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
   * 🏎️ getEventById con caché + deduplicación
   * - No repite petición si ya hay una en curso o en caché válida.
   * - TTL configurable con opts.ttlMs (por defecto 5 min).
   * - Forzar refresh con opts.refresh = true.
   */
  getEventById(
    id: number,
    opts?: { refresh?: boolean; ttlMs?: number }
  ): Observable<EventModelFullData> {
    const refresh = !!opts?.refresh;
    const ttl = opts?.ttlMs ?? this.CACHE_TTL_MS;
    const now = Date.now();

    const cached = this.eventByIdCache.get(id);
    if (!refresh && cached && cached.expiresAt > now) {
      return cached.value$; // ✅ usa caché
    }

    // ⚠️ OJO: si tu backend NO soporta /events.php/{id}, cambia a:
    // this.http.get<EventModelFullData>(this.apiUrl, { params: { id: String(id) } })
    const req$ = this.http.get<EventModelFullData>(`${this.apiUrl}/${id}`).pipe(
      shareReplay({ bufferSize: 1, refCount: false }),
      catchError((err) => this.generalService.handleHttpError(err))
    );

    this.eventByIdCache.set(id, { expiresAt: now + ttl, value$: req$ });
    return req$;
  }

  /**
   * 🔮 Prefetch: calienta la caché (ideal antes de abrir una modal)
   */
  prefetchEventById(id: number, ttlMs?: number): void {
    this.getEventById(id, { ttlMs })
      .pipe(take(1))
      .subscribe({ next: () => {}, error: () => {} });
  }

  /**
   * 🧹 Limpia caché (todo o por id)
   */
  clearEventCache(id?: number): void {
    if (typeof id === 'number') this.eventByIdCache.delete(id);
    else this.eventByIdCache.clear();
  }

  getEventsByPeriodicId(periodicId: string): Observable<EventModel[]> {
    return this.http
      .get<EventModel[]>(this.apiUrl, {
        params: { periodic_id: periodicId },
      })
      .pipe(catchError((err) => this.generalService.handleHttpError(err)));
  }

  // ---------- POST/PUT ----------
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

  // ---------- DELETE ----------
  delete(id: number): Observable<any> {
    return this.generalService
      .deleteOverride<any>(this.apiUrl, { id })
      .pipe(catchError((err) => this.generalService.handleHttpError(err)));
  }

  /**
   * 🔧 Unifica borrado por periodic_id con keepId opcional
   * (sustituye a los tres métodos duplicados)
   */
  deleteByPeriodicId(periodicId: string, keepId?: number): Observable<void> {
    const payload: Record<string, string | number> = {
      periodic_id: periodicId,
    };
    if (typeof keepId === 'number') payload['keep_id'] = keepId; // 👈 usar corchetes
    return this.generalService.deleteOverride<void>(this.apiUrl, payload);
  }

  // ⚠️ Mantengo tus métodos previos por compatibilidad, pero delegan:
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

  // ---------- Utils ----------
  /**
   * Devuelven copia ordenada (no mutan).
   */
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
    // Si quieres ascendente: (a, b) => a.id - b.id
  }

  hasResults(events: EventModelFullData[] | null): boolean {
    return !!events && events.length > 0;
  }

  countEvents(events: EventModelFullData[] | null): number {
    return events?.length ?? 0;
  }
}
