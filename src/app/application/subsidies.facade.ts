import { DestroyRef, inject, Injectable } from '@angular/core';
import {
  BehaviorSubject,
  catchError,
  map,
  Observable,
  tap,
  throwError,
} from 'rxjs';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { SubsidyModel } from '../core/interfaces/subsidy.interface';
import { SubsidiesService } from '../core/services/subsidies.services';
import { HttpErrorResponse } from '@angular/common/http';

@Injectable({
  providedIn: 'root',
})
export class SubsidiesFacade {
  private destroyRef = inject(DestroyRef);
  private subsidiesService = inject(SubsidiesService);
  private subsidiesSubject = new BehaviorSubject<SubsidyModel[]>([]);
  private selectedSubsidySubject = new BehaviorSubject<SubsidyModel | null>(
    null
  );
  private filteredSubsidiesByTypeSubject = new BehaviorSubject<SubsidyModel[]>(
    []
  );
  private filteredSubsidiesSubject = new BehaviorSubject<SubsidyModel[]>([]);
  private currentFilterTypeSubject = new BehaviorSubject<string | null>(null);

  subsidies$ = this.subsidiesSubject.asObservable();
  selectedSubsidy$ = this.selectedSubsidySubject.asObservable();
  currentFilterType$ = this.currentFilterTypeSubject.asObservable();

  constructor() {}

  // Método para aplicar filtros
  applyFilterTab(filterType: string | null): void {
    this.currentFilterTypeSubject.next(filterType);
    const invoices = this.subsidiesSubject.getValue();
    const filtered = filterType
      ? invoices.filter((subsidy) => subsidy.name === filterType)
      : invoices;

    this.filteredSubsidiesByTypeSubject.next(filtered);
  }

  loadAllSubsidies(): void {
    this.subsidiesService
      .getSubisidies()
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        tap((subsidies: SubsidyModel[]) =>
          this.subsidiesSubject.next(subsidies)
        ),
        catchError(this.handleError)
      )
      .subscribe();
  }

  loadSubsidyById(id: number): void {
    this.subsidiesService
      .getSubsidieById(id)
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        tap((subsidy: SubsidyModel) =>
          this.selectedSubsidySubject.next(subsidy)
        )
      )
      .subscribe();
  }

  loadSubsidiesByType(type: string): void {
    this.subsidiesService
      .getSubsidiesByType(type)
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        tap((subsidies: SubsidyModel[]) =>
          this.subsidiesSubject.next(subsidies)
        )
      )
      .subscribe();
  }

  loadSubsidiesByLatest(): void {
    this.subsidiesService
      .getSubsidiesByLatest()
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        tap((subsidies: SubsidyModel[]) => this.updateSubsidyState(subsidies)),
        catchError(this.handleError)
      )
      .subscribe();
  }

  loadSubsidiesByYear(year: number): void {
    this.subsidiesService
      .getSubsidiesByYear(year)
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        tap((subsidies: SubsidyModel[]) => {
          this.subsidiesSubject.next(subsidies);
        })
      )
      .subscribe();
  }

  addSubsidy(subsidy: SubsidyModel): Observable<SubsidyModel> {
    return this.subsidiesService
      .add(subsidy)
      .pipe(tap(() => this.loadAllSubsidies()));
  }

  editSubsidy(itemId: number, subsidy: SubsidyModel): void {
    this.subsidiesService
      .edit(itemId, subsidy)
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        tap(() => this.loadAllSubsidies())
      )
      .subscribe();
  }

  deleteSubsidy(id: number): void {
    this.subsidiesService
      .delete(id)
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        tap(() => this.loadAllSubsidies())
      )
      .subscribe();
  }

  // Clear selected subsidy
  clearSelectedSubsidy(): void {
    this.selectedSubsidySubject.next(null);
  }

  updateSubsidyState(subsidies: SubsidyModel[]): void {
    this.subsidiesSubject.next(subsidies);
    this.filteredSubsidiesSubject.next(subsidies); // Actualiza también los libros filtrados
  }
  // Método para manejar errores
  handleError(error: HttpErrorResponse) {
    let errorMessage = '';

    if (error.error instanceof ErrorEvent) {
      // Error del lado del cliente o red
      errorMessage = `Error del cliente o red: ${error.error.message}`;
    } else {
      // El backend retornó un código de error no exitoso
      errorMessage = `Código de error del servidor: ${error.status}\nMensaje: ${error.message}`;
    }

    console.error(errorMessage); // Para depuración

    // Aquí podrías devolver un mensaje amigable para el usuario, o simplemente retornar el error
    return throwError(
      () =>
        new Error(
          'Hubo un problema con la solicitud, inténtelo de nuevo más tarde.'
        )
    );
  }
}
