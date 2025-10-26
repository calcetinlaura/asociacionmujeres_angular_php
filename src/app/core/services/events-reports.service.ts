import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { catchError, map } from 'rxjs';
import { environments } from 'src/environments/environments';
import { EventReport } from '../interfaces/event.interface';
import { GeneralService } from './generalService.service';

@Injectable({ providedIn: 'root' })
export class EventsReportsService {
  private http = inject(HttpClient);
  private generalService = inject(GeneralService);

  private readonly apiUrl: string = `${environments.api}/backend/eventsreports.php`;

  /** 🔹 Obtener todos los informes */
  getAllReports() {
    return this.http
      .get<EventReport[]>(this.apiUrl)
      .pipe(catchError((err) => this.generalService.handleHttpError(err)));
  }

  /** 🔹 Obtener un informe por event_id */
  getReportByEventId(eventId: number) {
    return this.http
      .get<EventReport[]>(this.apiUrl, { params: { event_id: eventId } as any })
      .pipe(
        map((reports) =>
          Array.isArray(reports) && reports.length > 0 ? reports[0] : null
        ),
        catchError((err) => this.generalService.handleHttpError(err))
      );
  }
  /** 🔹 Obtener los event_id que ya tienen informe */
  getEventIdsWithReport() {
    return this.http
      .get<number[]>(this.apiUrl, { params: { list: 'event_ids' } as any })
      .pipe(
        map((ids) => (Array.isArray(ids) ? ids : [])),
        catchError((err) => this.generalService.handleHttpError(err))
      );
  }

  /** 🔹 Crear informe */
  add(formData: FormData) {
    return this.http
      .post(this.apiUrl, formData)
      .pipe(catchError((err) => this.generalService.handleHttpError(err)));
  }

  /** 🔹 Editar informe */
  edit(formData: FormData) {
    return this.http
      .post(this.apiUrl, formData)
      .pipe(catchError((err) => this.generalService.handleHttpError(err)));
  }

  /** 🔹 Eliminar informe */
  delete(id: number) {
    return this.http
      .delete(`${this.apiUrl}?id=${id}`)
      .pipe(catchError((err) => this.generalService.handleHttpError(err)));
  }
}
