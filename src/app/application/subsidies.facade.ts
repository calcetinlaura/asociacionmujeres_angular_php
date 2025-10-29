import { inject, Injectable } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { BehaviorSubject, EMPTY, Observable, Subject } from 'rxjs';
import { catchError, finalize, tap } from 'rxjs/operators';
import { SubsidyModelFullData } from 'src/app/core/interfaces/subsidy.interface';
import { SubsidiesService } from 'src/app/core/services/subsidies.services';
import { filterByKeyword, sortByYear } from '../shared/utils/facade.utils';
import { LoadableFacade } from './loadable.facade';

@Injectable({ providedIn: 'root' })
export class SubsidiesFacade extends LoadableFacade {
  private readonly subsidiesService = inject(SubsidiesService);

  // ───────── STATE ─────────
  private readonly subsidiesSubject = new BehaviorSubject<
    SubsidyModelFullData[] | null
  >(null);
  private readonly filteredSubsidiesSubject = new BehaviorSubject<
    SubsidyModelFullData[] | null
  >(null);
  private readonly selectedSubsidySubject =
    new BehaviorSubject<SubsidyModelFullData | null>(null);

  private readonly currentFilterSubject = new BehaviorSubject<string | null>(
    null
  );

  // ───────── EVENTOS ─────────
  private readonly savedSubject = new Subject<SubsidyModelFullData>();
  private readonly deletedSubject = new Subject<number>();

  // ───────── LOADERS ─────────
  private readonly listLoadingSubject = new BehaviorSubject<boolean>(false);
  private readonly itemLoadingSubject = new BehaviorSubject<boolean>(false);

  // ───────── PUBLIC STREAMS ─────────
  readonly subsidies$ = this.subsidiesSubject.asObservable();
  readonly filteredSubsidies$ = this.filteredSubsidiesSubject.asObservable();
  readonly selectedSubsidy$ = this.selectedSubsidySubject.asObservable();
  readonly currentFilter$ = this.currentFilterSubject.asObservable();

  readonly saved$ = this.savedSubject.asObservable();
  readonly deleted$ = this.deletedSubject.asObservable();

  readonly isLoadingList$ = this.listLoadingSubject.asObservable();
  readonly isLoadingItem$ = this.itemLoadingSubject.asObservable();

  private currentFilter: number | null = null;

  // ───────── LISTA → isLoadingList$ ─────────
  loadAllSubsidies(): void {
    this.setCurrentFilter(null);
    this.listLoadingSubject.next(true);

    this.subsidiesService
      .getSubsidies()
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        tap((subs) => this.updateSubsidyState(subs)),
        catchError((err) => {
          this.generalService.handleHttpError(err);
          return EMPTY;
        }),
        finalize(() => this.listLoadingSubject.next(false))
      )
      .subscribe();
  }

  loadSubsidiesByYear(year: number): void {
    this.setCurrentFilter(year);
    this.listLoadingSubject.next(true);

    this.subsidiesService
      .getSubsidiesByYear(year)
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        tap((subs) => this.updateSubsidyState(subs)),
        catchError((err) => {
          this.generalService.handleHttpError(err);
          return EMPTY;
        }),
        finalize(() => this.listLoadingSubject.next(false))
      )
      .subscribe();
  }

  loadSubsidiesByType(type: string): void {
    this.listLoadingSubject.next(true);

    this.subsidiesService
      .getSubsidiesByType(type)
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        tap((subs) => this.updateSubsidyState(subs)),
        catchError((err) => {
          this.generalService.handleHttpError(err);
          return EMPTY;
        }),
        finalize(() => this.listLoadingSubject.next(false))
      )
      .subscribe();
  }

  loadLatestSubsidies(): void {
    this.setCurrentFilter(null);
    this.listLoadingSubject.next(true);

    this.subsidiesService
      .getSubsidiesByLatest()
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        tap((subs) => this.updateSubsidyState(subs)),
        catchError((err) => {
          this.generalService.handleHttpError(err);
          return EMPTY;
        }),
        finalize(() => this.listLoadingSubject.next(false))
      )
      .subscribe();
  }

  // ───────── ITEM → isLoadingItem$ ─────────
  loadSubsidyById(id: number): void {
    this.itemLoadingSubject.next(true);

    this.subsidiesService
      .getSubsidyById(id)
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        tap((sub) => this.selectedSubsidySubject.next(sub)),
        catchError((err) => {
          this.generalService.handleHttpError(err);
          return EMPTY;
        }),
        finalize(() => this.itemLoadingSubject.next(false))
      )
      .subscribe();
  }

  // ───────── CRUD ─────────
  addSubsidy(subsidy: FormData): Observable<SubsidyModelFullData> {
    this.itemLoadingSubject.next(true);

    return this.subsidiesService.add(subsidy).pipe(
      takeUntilDestroyed(this.destroyRef),
      tap((saved) => {
        this.savedSubject.next(saved);
        this.reloadCurrentFilter();
      }),
      catchError((err) => {
        this.generalService.handleHttpError(err);
        return EMPTY;
      }),
      finalize(() => this.itemLoadingSubject.next(false))
    );
  }

  editSubsidy(subsidy: FormData): Observable<SubsidyModelFullData> {
    this.itemLoadingSubject.next(true);

    return this.subsidiesService.edit(subsidy).pipe(
      takeUntilDestroyed(this.destroyRef),
      tap((saved) => {
        this.savedSubject.next(saved);
        this.reloadCurrentFilter();
      }),
      catchError((err) => {
        this.generalService.handleHttpError(err);
        return EMPTY;
      }),
      finalize(() => this.itemLoadingSubject.next(false))
    );
  }

  deleteSubsidy(id: number): void {
    this.itemLoadingSubject.next(true);

    this.subsidiesService
      .delete(id)
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        tap(() => {
          this.deletedSubject.next(id);
          this.reloadCurrentFilter();
        }),
        catchError((err) => {
          this.generalService.handleHttpError(err);
          return EMPTY;
        }),
        finalize(() => this.itemLoadingSubject.next(false))
      )
      .subscribe();
  }

  // ───────── BUSCADOR / FILTROS ─────────
  applyFilterWord(keyword: string): void {
    const all = this.subsidiesSubject.getValue();
    this.filteredSubsidiesSubject.next(
      filterByKeyword(all, keyword, [(b) => b.name])
    );
  }

  // ───────── HELPERS / STATE ─────────
  clearSelectedSubsidy(): void {
    this.selectedSubsidySubject.next(null);
  }

  setCurrentFilter(year: number | null): void {
    this.currentFilter = year;
    this.currentFilterSubject.next(year?.toString() ?? null);
  }

  private reloadCurrentFilter(): void {
    if (this.currentFilter === null) {
      this.loadAllSubsidies();
    } else {
      this.loadSubsidiesByYear(this.currentFilter);
    }
  }

  private updateSubsidyState(subsidies: SubsidyModelFullData[] | null): void {
    const data = subsidies ?? [];
    const sorted = sortByYear(data);
    this.subsidiesSubject.next(sorted);
    this.filteredSubsidiesSubject.next(sorted);
  }
}
