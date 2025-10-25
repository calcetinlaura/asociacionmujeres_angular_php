import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { EMPTY, Observable } from 'rxjs';
import { catchError, shareReplay, take, tap } from 'rxjs/operators';
import {
  EventModel,
  EventModelFullData,
} from 'src/app/core/interfaces/event.interface';
import { GeneralService } from 'src/app/core/services/generalService.service';
import { environments } from 'src/environments/environments';
import { AgentEventsQuery } from '../interfaces/agent.interface';

/**
 * Tipos de consulta
 * - PeriodicView: cómo mostrar series periódicas
 * - PublishScope: qué estados de publicación incluir
 */
export type PeriodicView = 'all' | 'groupedByPeriodicId';
export type PublishScope = 'published' | 'drafts' | 'scheduled' | 'all';

@Injectable({ providedIn: 'root' })
export class EventsService {
  private readonly generalService = inject(GeneralService);
  private readonly http = inject(HttpClient);
  private readonly apiUrl = `${environments.api}/backend/events.php`;

  // 📦 Cache por macroevento: request + valor materializado
  private byMacroReq = new Map<number, Observable<EventModel[]>>();
  private byMacroVal = new Map<number, EventModel[]>();

  // ====== GETs ======

  /** Lista base (sin filtros) */
  getEvents(): Observable<EventModel[]> {
    return this.http
      .get<EventModel[]>(this.apiUrl)
      .pipe(catchError((err) => this.generalService.handleHttpError(err)));
  }

  /**
   * Listado por año con control de vista y alcance de publicación.
   * - view: 'all' → todas las instancias; 'groupedByPeriodicId' → una por serie
   * - scope: 'published' | 'drafts' | 'scheduled' | 'all'
   */
  getEventsByYear(
    year: number,
    view: 'all' | 'groupedByPeriodicId',
    scope: 'published' | 'drafts' | 'scheduled' | 'all'
  ): Observable<EventModelFullData[]> {
    const params: Record<string, string> = {
      year: String(year),
      view, // 👈 clave correcta para el backend
      scope, // 'published' | 'drafts' | 'scheduled' | 'all'
    };

    return this.http
      .get<EventModelFullData[]>(this.apiUrl, { params })
      .pipe(catchError((err) => this.generalService.handleHttpError(err)));
  }
  /** Lista por macroevento (con caché en memoria) */
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

  /**
   * Lista por agente (opcionalmente filtrando por year/role/order)
   * Si en el futuro quieres también view/scope aquí, añade los params y listo.
   */
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

  /** Lista por proyecto */
  getEventsByProject(projectId: number): Observable<EventModel[]> {
    return this.http
      .get<EventModel[]>(this.apiUrl, {
        params: { project_id: String(projectId) },
      })
      .pipe(catchError((err) => this.generalService.handleHttpError(err)));
  }

  /**
   * getEventById con endpoint REST-like que ya usabas.
   * Si prefieres query param (?id=), ajusta aquí y en backend.
   */
  getEventById(id: number): Observable<EventModelFullData> {
    return this.http
      .get<EventModelFullData>(`${this.apiUrl}/${id}`)
      .pipe(catchError((err) => this.generalService.handleHttpError(err)));
  }

  /** Prefetch de un evento (ignora errores) */
  prefetchEventById(id: number): void {
    this.getEventById(id)
      .pipe(
        take(1),
        catchError(() => EMPTY)
      )
      .subscribe();
  }

  /** Lista de eventos por periodic_id */
  getEventsByPeriodicId(periodicId: string): Observable<EventModel[]> {
    return this.http
      .get<EventModel[]>(this.apiUrl, { params: { periodic_id: periodicId } })
      .pipe(catchError((err) => this.generalService.handleHttpError(err)));
  }
  getAllByScope(
    view: 'all' | 'groupedByPeriodicId',
    scope: 'published' | 'drafts' | 'scheduled' | 'all'
  ): Observable<EventModelFullData[]> {
    const params: Record<string, string> = { view, scope };
    return this.http
      .get<EventModelFullData[]>(this.apiUrl, { params })
      .pipe(catchError((err) => this.generalService.handleHttpError(err)));
  }
  // ====== POST/PUT ======

  /** Alta de evento (FormData completo) */
  add(event: FormData): Observable<any> {
    return this.http
      .post(this.apiUrl, event)
      .pipe(catchError((err) => this.generalService.handleHttpError(err)));
  }

  /** Edición (si tu backend diferencia add/edit por contenido de FormData) */
  edit(event: FormData): Observable<any> {
    return this.http
      .post(this.apiUrl, event)
      .pipe(catchError((err) => this.generalService.handleHttpError(err)));
  }

  /** Update explícito por id (manteniendo tu firma actual) */
  updateEvent(id: number, formData: FormData): Observable<any> {
    return this.http
      .post(`${this.apiUrl}?id=${id}`, formData)
      .pipe(catchError((err) => this.generalService.handleHttpError(err)));
  }

  // ====== DELETE ======

  /** Borrado por id (usa tu deleteOverride para soportar body en DELETE) */
  delete(id: number): Observable<any> {
    return this.generalService
      .deleteOverride<any>(this.apiUrl, { id })
      .pipe(catchError((err) => this.generalService.handleHttpError(err)));
  }

  /**
   * Unificación de borrados por periodic_id
   * - Si pasas keepId, borra todos menos ese (para “convertir en único”)
   */
  deleteByPeriodicId(periodicId: string, keepId?: number): Observable<void> {
    const payload: Record<string, string | number> = {
      periodic_id: periodicId,
    };
    if (typeof keepId === 'number') payload['keep_id'] = keepId;
    return this.generalService
      .deleteOverride<void>(this.apiUrl, payload)
      .pipe(catchError((err) => this.generalService.handleHttpError(err)));
  }

  // Aliases de compatibilidad (por si todavía los usas en otros sitios)
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
