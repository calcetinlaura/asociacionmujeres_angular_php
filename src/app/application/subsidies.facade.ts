import { inject, Injectable } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { BehaviorSubject, EMPTY, Observable, Subject } from 'rxjs';
import { catchError, finalize, tap } from 'rxjs/operators';
import { SubsidyModelFullData } from 'src/app/core/interfaces/subsidy.interface';
import { SubsidiesService } from 'src/app/core/services/subsidies.services';
import { includesNormalized, toSearchKey } from '../shared/utils/text.utils';
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

  // ───────── ITEM → isLoadingItem$ ─────────
  loadSubsidyById(id: number): void {
    this.itemLoadingSubject.next(true);

    this.subsidiesService
      .getSubsidieById(id)
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
        this.savedSubject.next(saved as SubsidyModelFullData);
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
        this.savedSubject.next(saved as SubsidyModelFullData);
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

  // ───────── HELPERS ─────────
  clearSelectedSubsidy(): void {
    this.selectedSubsidySubject.next(null);
  }

  applyFilterWord(keyword: string): void {
    const all = this.subsidiesSubject.getValue();
    const key = toSearchKey(keyword);

    if (!all) {
      this.filteredSubsidiesSubject.next(all);
      return;
    }

    if (!key) {
      this.filteredSubsidiesSubject.next(all);
      return;
    }

    const filtered = all.filter((s) =>
      [s.name].filter(Boolean).some((field) => includesNormalized(field!, key))
    );

    this.filteredSubsidiesSubject.next(filtered);
  }

  setCurrentFilter(year: number | null): void {
    this.currentFilter = year;
  }

  private reloadCurrentFilter(): void {
    if (this.currentFilter === null) {
      this.loadAllSubsidies();
    } else {
      this.loadSubsidiesByYear(this.currentFilter);
    }
  }

  private updateSubsidyState(subsidies: SubsidyModelFullData[]): void {
    this.subsidiesSubject.next(subsidies);
    this.filteredSubsidiesSubject.next(subsidies);
  }
}
