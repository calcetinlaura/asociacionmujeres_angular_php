import { HttpErrorResponse } from '@angular/common/http';
import { DestroyRef, inject, Injectable } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { BehaviorSubject, catchError, Observable, tap, throwError } from 'rxjs';
import { SubsidyModel } from 'src/app/core/interfaces/subsidy.interface';
import { SubsidiesService } from 'src/app/core/services/subsidies.services';

@Injectable({
  providedIn: 'root',
})
export class SubsidiesFacade {
  private readonly destroyRef = inject(DestroyRef);
  private readonly subsidiesService = inject(SubsidiesService);

  private subsidiesSubject = new BehaviorSubject<SubsidyModel[]>([]);
  private filteredSubsidiesSubject = new BehaviorSubject<SubsidyModel[]>([]);
  private selectedSubsidySubject = new BehaviorSubject<SubsidyModel | null>(
    null
  );

  private currentFilter: string = 'TODOS';
  private isLoadingSubject = new BehaviorSubject<boolean>(false);

  isLoadingSubsidies$ = this.isLoadingSubject.asObservable();
  subsidies$ = this.subsidiesSubject.asObservable();
  filteredSubsidies$ = this.filteredSubsidiesSubject.asObservable();
  selectedSubsidy$ = this.selectedSubsidySubject.asObservable();

  constructor() {}

  /** Filtro actual (por tipo) */
  setCurrentFilter(filter: string): void {
    this.currentFilter = filter;
    this.loadSubsidiesByFilter(filter);
  }

  private reloadCurrentFilter(): void {
    this.loadSubsidiesByFilter(this.currentFilter);
  }

  /** Centraliza el enrutamiento de filtros */
  loadSubsidiesByFilter(filter: string): void {
    const loaders: Record<string, () => void> = {
      TODOS: () => this.loadAllSubsidies(),
    };

    (loaders[filter] || (() => this.loadSubsidiesByType(filter)))();
  }

  loadAllSubsidies(): void {
    this.subsidiesService
      .getSubisidies()
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        tap((subsidies) => {
          this.updateSubsidyState(subsidies);
          this.isLoadingSubject.next(false);
        }),
        catchError((error) => {
          this.isLoadingSubject.next(false);
          return this.handleError(error);
        })
      )
      .subscribe();
  }

  loadSubsidiesByYear(year: number): void {
    this.isLoadingSubject.next(true); // Comienza carga
    this.subsidiesService
      .getSubsidiesByYear(year)
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        tap((subsidies) => {
          this.updateSubsidyState(subsidies);
          this.isLoadingSubject.next(false);
        }),
        catchError((error) => {
          this.isLoadingSubject.next(false);
          return this.handleError(error);
        })
      )
      .subscribe();
  }
  loadSubsidiesByType(type: string): void {
    this.subsidiesService
      .getSubsidiesByType(type)
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        tap((subsidies) => {
          this.updateSubsidyState(subsidies);
          this.isLoadingSubject.next(false);
        }),
        catchError((error) => {
          this.isLoadingSubject.next(false);
          return this.handleError(error);
        })
      )
      .subscribe();
  }

  loadSubsidiesByLatest(): void {
    this.subsidiesService
      .getSubsidiesByLatest()
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        tap((subsidies) => {
          this.updateSubsidyState(subsidies);
          this.isLoadingSubject.next(false);
        }),
        catchError((error) => {
          this.isLoadingSubject.next(false);
          return this.handleError(error);
        })
      )
      .subscribe();
  }

  loadSubsidyById(id: number): void {
    this.subsidiesService
      .getSubsidieById(id)
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        tap((subsidy) => this.selectedSubsidySubject.next(subsidy)),
        catchError(this.handleError)
      )
      .subscribe();
  }

  addSubsidy(subsidy: SubsidyModel): Observable<SubsidyModel> {
    return this.subsidiesService.add(subsidy).pipe(
      tap(() => this.reloadCurrentFilter()),
      catchError(this.handleError)
    );
  }

  editSubsidy(id: number, subsidy: SubsidyModel): Observable<SubsidyModel> {
    return this.subsidiesService.edit(id, subsidy).pipe(
      tap(() => this.reloadCurrentFilter()),
      catchError(this.handleError)
    );
  }

  deleteSubsidy(id: number): void {
    this.subsidiesService
      .delete(id)
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        tap(() => this.reloadCurrentFilter()),
        catchError(this.handleError)
      )
      .subscribe();
  }

  clearSelectedSubsidy(): void {
    this.selectedSubsidySubject.next(null);
  }

  /** Filtro por palabra clave */
  applyFilterWord(keyword: string): void {
    const allSubsidies = this.subsidiesSubject.getValue();

    if (!keyword || !allSubsidies) {
      this.filteredSubsidiesSubject.next(allSubsidies ?? []);
      return;
    }

    const search = keyword.trim().toLowerCase();
    const filtered = allSubsidies.filter((subsidy) =>
      subsidy.name.toLowerCase().includes(search)
    );

    this.filteredSubsidiesSubject.next(filtered);
  }

  /** Actualiza el estado base y el filtrado inicial */
  private updateSubsidyState(subsidies: SubsidyModel[]): void {
    this.subsidiesSubject.next(subsidies);
    this.filteredSubsidiesSubject.next(subsidies);
  }

  /** Manejo de errores */
  private handleError(error: HttpErrorResponse) {
    const errorMessage =
      error.error instanceof ErrorEvent
        ? `Error del cliente o red: ${error.error.message}`
        : `Error del servidor: ${error.status} - ${error.message}`;

    console.error('SubsidiesFacade error:', errorMessage);
    return throwError(() => new Error('Error al procesar la solicitud.'));
  }
}
