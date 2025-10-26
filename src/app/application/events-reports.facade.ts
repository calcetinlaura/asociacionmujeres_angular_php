import { DestroyRef, inject, Injectable } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { BehaviorSubject, catchError, finalize, Observable, tap } from 'rxjs';
import { EventsReportsService } from 'src/app/core/services/events-reports.service';
import { GeneralService } from 'src/app/core/services/generalService.service';
import { EventReportModel } from '../core/interfaces/event.interface';

@Injectable({ providedIn: 'root' })
export class EventsReportsFacade {
  private destroyRef = inject(DestroyRef);
  private eventReportsService = inject(EventsReportsService);
  private generalService = inject(GeneralService);

  // ─────────────────────────────────────────────
  // STATE
  // ─────────────────────────────────────────────
  private readonly reportsSubject = new BehaviorSubject<
    EventReportModel[] | null
  >(null);
  private readonly selectedReportSubject =
    new BehaviorSubject<EventReportModel | null>(null);
  private readonly listLoadingSubject = new BehaviorSubject<boolean>(false);
  private readonly itemLoadingSubject = new BehaviorSubject<boolean>(false);
  private readonly eventIdsWithReportSubject = new BehaviorSubject<number[]>(
    []
  );

  // ─────────────────────────────────────────────
  // PUBLIC STREAMS
  // ─────────────────────────────────────────────
  readonly reports$ = this.reportsSubject.asObservable();
  readonly selectedReport$ = this.selectedReportSubject.asObservable();
  readonly isLoadingList$ = this.listLoadingSubject.asObservable();
  readonly isLoadingItem$ = this.itemLoadingSubject.asObservable();
  readonly eventIdsWithReport$ = this.eventIdsWithReportSubject.asObservable();

  // ─────────────────────────────────────────────
  // CARGAS
  // ─────────────────────────────────────────────

  /** 🔹 Cargar informe por event_id */
  loadReportByEventId(eventId: number): void {
    this.itemLoadingSubject.next(true);
    console.log('📡 [Facade] Cargando informe por event_id:', eventId);

    this.eventReportsService
      .getReportByEventId(eventId)
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        tap((report) => {
          console.log('✅ [Facade] Informe recibido:', report);
          this.selectedReportSubject.next(report);
        }),
        catchError((err) => this.generalService.handleHttpError(err)),
        finalize(() => this.itemLoadingSubject.next(false))
      )
      .subscribe();
  }

  /** 🔹 Cargar todos los informes */
  loadAllReports(): void {
    this.listLoadingSubject.next(true);
    console.log('📡 [Facade] Cargando todos los informes');

    this.eventReportsService
      .getAllReports()
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        tap((reports) => {
          console.log('✅ [Facade] Informes recibidos:', reports);
          this.reportsSubject.next(reports);
        }),
        catchError((err) => this.generalService.handleHttpError(err)),
        finalize(() => this.listLoadingSubject.next(false))
      )
      .subscribe();
  }

  /** 🔹 Cargar IDs de eventos con informe */
  loadEventIdsWithReport(): void {
    this.listLoadingSubject.next(true);
    console.log('📡 [Facade] Cargando event_ids con informe');

    this.eventReportsService
      .getEventIdsWithReport()
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        tap((ids) => {
          console.log('✅ [Facade] Event IDs con informe:', ids);
          this.eventIdsWithReportSubject.next(ids);
        }),
        catchError((err) => this.generalService.handleHttpError(err)),
        finalize(() => this.listLoadingSubject.next(false))
      )
      .subscribe();
  }

  // ─────────────────────────────────────────────
  // CRUD
  // ─────────────────────────────────────────────

  /** 🔹 Crear informe */
  add(formData: FormData): Observable<any> {
    this.itemLoadingSubject.next(true);
    console.log('📤 [Facade] Creando nuevo informe');

    return this.eventReportsService.add(formData).pipe(
      tap(() => {
        this.loadAllReports();
        this.loadEventIdsWithReport();
      }),
      catchError((err) => this.generalService.handleHttpError(err)),
      finalize(() => this.itemLoadingSubject.next(false))
    );
  }

  /** 🔹 Editar informe */
  edit(formData: FormData): Observable<any> {
    this.itemLoadingSubject.next(true);
    console.log('✏️ [Facade] Editando informe existente');

    return this.eventReportsService.edit(formData).pipe(
      tap(() => {
        this.loadAllReports();
        this.loadEventIdsWithReport();
      }),
      catchError((err) => this.generalService.handleHttpError(err)),
      finalize(() => this.itemLoadingSubject.next(false))
    );
  }

  /** 🔹 Eliminar informe */
  delete(id: number): void {
    this.itemLoadingSubject.next(true);
    console.log('🗑️ [Facade] Eliminando informe id:', id);

    this.eventReportsService
      .delete(id)
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        tap(() => {
          this.loadAllReports();
          this.loadEventIdsWithReport();
        }),
        catchError((err) => this.generalService.handleHttpError(err)),
        finalize(() => this.itemLoadingSubject.next(false))
      )
      .subscribe();
  }

  // ─────────────────────────────────────────────
  // UTILIDADES
  // ─────────────────────────────────────────────
  clearSelected(): void {
    this.selectedReportSubject.next(null);
  }
}
