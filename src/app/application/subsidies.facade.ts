import { DestroyRef, inject, Injectable } from '@angular/core';
import { BehaviorSubject, map, Observable, tap } from 'rxjs';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { SubsidyModel } from '../core/interfaces/subsidy.interface';
import { SubsidiesService } from '../core/services/subsidies.services';

@Injectable({
  providedIn: 'root',
})
export class SubsidiesFacade {
  private destroyRef = inject(DestroyRef);
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

  constructor(private subsidiesService: SubsidiesService) {}

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
      .getAll()
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        tap((subsidies: SubsidyModel[]) =>
          this.subsidiesSubject.next(subsidies)
        )
      )
      .subscribe();
  }

  loadSubsidyById(id: number): void {
    this.subsidiesService
      .getById(id)
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
      .getAllByType(type)
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        tap((subsidies: SubsidyModel[]) =>
          this.subsidiesSubject.next(subsidies)
        )
      )
      .subscribe();
  }

  loadSubsidiesByYear(year: number): void {
    this.subsidiesService
      .getAllByYear(year)
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        tap((subsidies: SubsidyModel[]) => {
          this.subsidiesSubject.next(subsidies);
        })
      )
      .subscribe();
  }
  getYearNews(): Observable<number> {
    return this.subsidiesService.getAll().pipe(
      takeUntilDestroyed(this.destroyRef),
      map((subsidies: SubsidyModel[]) => {
        if (subsidies.length > 0) {
          const maxYear = Math.max(...subsidies.map((subsidy) => subsidy.year)); // Cambié this.subsidies a subsidies
          return maxYear; // Devuelve el año máximo
        } else {
          return new Date().getFullYear(); // Devuelve el año actual si no hay películas
        }
      })
    );
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
}
