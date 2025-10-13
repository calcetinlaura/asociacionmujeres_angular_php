import { inject, Injectable } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { BehaviorSubject, Observable, Subject } from 'rxjs';
import { catchError, finalize, tap } from 'rxjs/operators';
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

  // NEW: loaders separados
  private readonly listLoadingSubject = new BehaviorSubject<boolean>(false);
  private readonly itemLoadingSubject = new BehaviorSubject<boolean>(false);

  // Eventos
  private readonly savedSubject = new Subject<SubsidyModelFullData>();
  private readonly deletedSubject = new Subject<number>();

  // Streams públicos
  readonly subsidies$ = this.subsidiesSubject.asObservable();
  readonly filteredSubsidies$ = this.filteredSubsidiesSubject.asObservable();
  readonly selectedSubsidy$ = this.selectedSubsidySubject.asObservable();
  readonly saved$ = this.savedSubject.asObservable();
  readonly deleted$ = this.deletedSubject.asObservable();

  // NEW: expón loaders a la UI
  readonly isLoadingList$ = this.listLoadingSubject.asObservable();
  readonly isLoadingItem$ = this.itemLoadingSubject.asObservable();

  private currentFilter: number | null = null;

  // ───────── LISTA (isLoadingList$)
  loadAllSubsidies(): void {
    this.setCurrentFilter(null);
    this.listLoadingSubject.next(true);
    this.subsidiesService
      .getSubsidies()
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        catchError((err) => this.generalService.handleHttpError(err)),
        finalize(() => this.listLoadingSubject.next(false))
      )
      .subscribe((subs) => this.updateSubsidyState(subs));
  }

  loadSubsidiesByYear(year: number): void {
    this.setCurrentFilter(year);
    this.listLoadingSubject.next(true);
    this.subsidiesService
      .getSubsidiesByYear(year)
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        catchError((err) => this.generalService.handleHttpError(err)),
        finalize(() => this.listLoadingSubject.next(false))
      )
      .subscribe((subs) => this.updateSubsidyState(subs));
  }

  // ───────── ITEM (isLoadingItem$)
  loadSubsidyById(id: number): void {
    this.itemLoadingSubject.next(true);
    this.subsidiesService
      .getSubsidieById(id)
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        catchError((err) => this.generalService.handleHttpError(err)),
        finalize(() => this.itemLoadingSubject.next(false))
      )
      .subscribe((sub) => this.selectedSubsidySubject.next(sub));
  }

  /** Devuelve el guardado y emite saved$ */
  addSubsidy(subsidy: FormData): Observable<SubsidyModelFullData> {
    this.itemLoadingSubject.next(true);
    return this.subsidiesService.add(subsidy).pipe(
      takeUntilDestroyed(this.destroyRef),
      tap((saved) => {
        this.savedSubject.next(saved as SubsidyModelFullData);
        this.reloadCurrentFilter();
      }),
      catchError((err) => this.generalService.handleHttpError(err)),
      finalize(() => this.itemLoadingSubject.next(false))
    );
  }

  /** Devuelve el editado y emite saved$ */
  editSubsidy(subsidy: FormData): Observable<SubsidyModelFullData> {
    this.itemLoadingSubject.next(true);
    return this.subsidiesService.edit(subsidy).pipe(
      takeUntilDestroyed(this.destroyRef),
      tap((saved) => {
        this.savedSubject.next(saved as SubsidyModelFullData);
        this.reloadCurrentFilter();
      }),
      catchError((err) => this.generalService.handleHttpError(err)),
      finalize(() => this.itemLoadingSubject.next(false))
    );
  }

  /** Emite deleted$ con el id borrado */
  deleteSubsidy(id: number): void {
    this.itemLoadingSubject.next(true);
    this.subsidiesService
      .delete(id)
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        catchError((err) => this.generalService.handleHttpError(err)),
        finalize(() => this.itemLoadingSubject.next(false))
      )
      .subscribe(() => {
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
