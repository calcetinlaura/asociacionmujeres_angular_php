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

@Injectable({
  providedIn: 'root',
})
export class EventsService {
  private readonly generalService = inject(GeneralService);
  private apiUrl: string = `${environments.api}/backend/events.php`;
  constructor(private http: HttpClient) {}

  getEvents(): Observable<any> {
    return this.http
      .get(this.apiUrl)
      .pipe(catchError((err) => this.generalService.handleHttpError(err)));
  }
  getEventsByYear(year: number): Observable<any> {
    return this.http
      .get(this.apiUrl, { params: { year: year } })
      .pipe(catchError((err) => this.generalService.handleHttpError(err)));
  }
  getEventsByMacroevent(macroeventId: number): Observable<any> {
    return this.http
      .get(this.apiUrl, {
        params: { macroevent_id: macroeventId },
      })
      .pipe(catchError((err) => this.generalService.handleHttpError(err)));
  }
  getEventById(id: number): Observable<any> {
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

  sortEventsByTitle(events: EventModelFullData[]): EventModel[] {
    return events.sort((a, b) =>
      a.title.toLowerCase().localeCompare(b.title.toLowerCase())
    );
  }

  sortEventsByDate(events: EventModel[]): EventModel[] {
    return events.sort(
      (a, b) => new Date(b.start).getTime() - new Date(a.start).getTime()
    );
  }

  sortEventsById(events: EventModelFullData[]): EventModel[] {
    return events.sort((a, b) => b.id - a.id);
  }

  hasResults(events: EventModelFullData[] | null): boolean {
    return !!events && events.length > 0;
  }

  countEvents(events: EventModelFullData[] | null): number {
    return events?.length ?? 0;
  }
}
