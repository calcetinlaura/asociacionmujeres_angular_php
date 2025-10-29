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

export type PeriodicView = 'all' | 'groupedByPeriodicId';
export type PublishScope = 'published' | 'drafts' | 'scheduled' | 'all';

@Injectable({ providedIn: 'root' })
export class EventsService {
  private readonly generalService = inject(GeneralService);
  private readonly http = inject(HttpClient);
  private readonly apiUrl = `${environments.api}/backend/events.php`;

  private byMacroReq = new Map<number, Observable<EventModel[]>>();
  private byMacroVal = new Map<number, EventModel[]>();
  private byIdReq = new Map<number, Observable<EventModelFullData>>();
  // ====== GETs ======

  getEvents(): Observable<EventModel[]> {
    return this.http
      .get<EventModel[]>(this.apiUrl)
      .pipe(catchError((err) => this.generalService.handleHttpError(err)));
  }

  getEventsByYear(
    year: number,
    view: PeriodicView,
    scope: PublishScope
  ): Observable<EventModelFullData[]> {
    const params = { year: String(year), view, scope };
    return this.http
      .get<EventModelFullData[]>(this.apiUrl, { params })
      .pipe(catchError((err) => this.generalService.handleHttpError(err)));
  }

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

  getEventById(id: number): Observable<EventModelFullData> {
    if (!this.byIdReq.has(id)) {
      const req$ = this.http
        .get<EventModelFullData>(`${this.apiUrl}/${id}`)
        .pipe(
          shareReplay({ bufferSize: 1, refCount: false }),
          catchError((err) => this.generalService.handleHttpError(err))
        );
      this.byIdReq.set(id, req$);
    }
    return this.byIdReq.get(id)!;
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

  getAllByScope(
    view: PeriodicView,
    scope: PublishScope
  ): Observable<EventModelFullData[]> {
    const params = { view, scope };
    return this.http
      .get<EventModelFullData[]>(this.apiUrl, { params })
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

  deleteByPeriodicId(periodicId: string, keepId?: number): Observable<void> {
    const payload: Record<string, string | number> = {
      periodic_id: periodicId,
    };
    if (typeof keepId === 'number') payload['keep_id'] = keepId;
    return this.generalService
      .deleteOverride<void>(this.apiUrl, payload)
      .pipe(catchError((err) => this.generalService.handleHttpError(err)));
  }

  deleteEventsByPeriodicIdExcept(
    periodicId: string,
    keepId: number
  ): Observable<void> {
    return this.deleteByPeriodicId(periodicId, keepId);
  }
}
