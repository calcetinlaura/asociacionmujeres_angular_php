import { inject, Injectable } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { BehaviorSubject, Observable, Subject } from 'rxjs';
import { catchError, tap } from 'rxjs/operators';
import { SubsidyModelFullData } from 'src/app/core/interfaces/subsidy.interface';
import { SubsidiesService } from 'src/app/core/services/subsidies.services';
import { includesNormalized, toSearchKey } from '../shared/utils/text.utils';
import { LoadableFacade } from './loadable.facade';

@Injectable({ providedIn: 'root' })
export class SubsidiesFacade extends LoadableFacade {
  private readonly subsidiesService = inject(SubsidiesService);

  // State
  private readonly subsidiesSubject = new BehaviorSubject<
    SubsidyModelFullData[] | null
  >(null);
  private readonly filteredSubsidiesSubject = new BehaviorSubject<
    SubsidyModelFullData[] | null
  >(null);
  private readonly selectedSubsidySubject =
    new BehaviorSubject<SubsidyModelFullData | null>(null);

  // Eventos
  private readonly savedSubject = new Subject<SubsidyModelFullData>();
  private readonly deletedSubject = new Subject<number>();

  // Streams públicos
  readonly subsidies$ = this.subsidiesSubject.asObservable();
  readonly filteredSubsidies$ = this.filteredSubsidiesSubject.asObservable();
  readonly selectedSubsidy$ = this.selectedSubsidySubject.asObservable();
  readonly saved$ = this.savedSubject.asObservable();
  readonly deleted$ = this.deletedSubject.asObservable();

  private currentFilter: number | null = null;

  loadAllSubsidies(): void {
    this.setCurrentFilter(null);
    this.executeWithLoading(this.subsidiesService.getSubsidies(), (subs) =>
      this.updateSubsidyState(subs)
    );
  }

  loadSubsidiesByYear(year: number): void {
    this.setCurrentFilter(year);
    this.executeWithLoading(
      this.subsidiesService.getSubsidiesByYear(year),
      (subs) => this.updateSubsidyState(subs)
    );
  }

  loadSubsidyById(id: number): void {
    this.executeWithLoading(this.subsidiesService.getSubsidieById(id), (sub) =>
      this.selectedSubsidySubject.next(sub)
    );
  }

  /** Devuelve el guardado y emite saved$ */
  addSubsidy(subsidy: FormData): Observable<SubsidyModelFullData> {
    return this.wrapWithLoading(this.subsidiesService.add(subsidy)).pipe(
      takeUntilDestroyed(this.destroyRef),
      tap((saved) => {
        this.savedSubject.next(saved as SubsidyModelFullData);
        this.reloadCurrentFilter();
      }),
      catchError((err) => this.generalService.handleHttpError(err))
    );
  }

  /** Devuelve el editado y emite saved$ */
  editSubsidy(subsidy: FormData): Observable<SubsidyModelFullData> {
    return this.wrapWithLoading(this.subsidiesService.edit(subsidy)).pipe(
      takeUntilDestroyed(this.destroyRef),
      tap((saved) => {
        this.savedSubject.next(saved as SubsidyModelFullData);
        this.reloadCurrentFilter();
      }),
      catchError((err) => this.generalService.handleHttpError(err))
    );
  }

  /** Devuelve el id borrado y emite deleted$ */
  // deleteSubsidy(id: number): Observable<number> {
  //   return this.wrapWithLoading(this.subsidiesService.delete(id)).pipe(
  //     takeUntilDestroyed(this.destroyRef),
  //     tap(() => {
  //       this.deletedSubject.next(id);
  //       this.reloadCurrentFilter();
  //     }),
  //     map(() => id),
  //     catchError((err) => this.generalService.handleHttpError(err))
  //   );
  // }
  deleteSubsidy(id: number): void {
    this.executeWithLoading(this.subsidiesService.delete(id), () => {
      this.deletedSubject.next(id);
      this.reloadCurrentFilter();
    });
  }

  // ---------- Utilidades ----------
  clearSelectedSubsidy(): void {
    this.selectedSubsidySubject.next(null);
  }

  applyFilterWord(keyword: string): void {
    const all = this.subsidiesSubject.getValue();
    const k = toSearchKey(keyword);

    if (!all || !k) {
      this.filteredSubsidiesSubject.next(all);
      return;
    }

    const filtered = all.filter((s) =>
      [s.name].filter(Boolean).some((field) => includesNormalized(field!, k))
    );

    this.filteredSubsidiesSubject.next(filtered);
  }

  setCurrentFilter(year: number | null): void {
    this.currentFilter = year;
  }

  private reloadCurrentFilter(): void {
    if (this.currentFilter === null) {
      this.loadAllSubsidies();
      return;
    }
    this.loadSubsidiesByYear(this.currentFilter);
  }

  private updateSubsidyState(subsidies: SubsidyModelFullData[]): void {
    this.subsidiesSubject.next(subsidies);
    this.filteredSubsidiesSubject.next(subsidies);
  }
}
