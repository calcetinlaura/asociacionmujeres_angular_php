import { inject, Injectable } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import {
  BehaviorSubject,
  catchError,
  EMPTY,
  finalize,
  Observable,
  take,
  tap,
} from 'rxjs';
import { MacroeventModelFullData } from '../core/interfaces/macroevent.interface';
import { MacroeventsService } from '../core/services/macroevents.services';
import { filterByKeyword } from '../shared/utils/facade.utils';
import { LoadableFacade } from './loadable.facade';

@Injectable({ providedIn: 'root' })
export class MacroeventsFacade extends LoadableFacade {
  private readonly macroeventsService = inject(MacroeventsService);

  private readonly macroeventsSubject = new BehaviorSubject<
    MacroeventModelFullData[]
  >([]);
  private readonly filteredMacroeventsSubject = new BehaviorSubject<
    MacroeventModelFullData[]
  >([]);
  private readonly selectedMacroeventSubject =
    new BehaviorSubject<MacroeventModelFullData | null>(null);

  private readonly listLoadingSubject = new BehaviorSubject<boolean>(false);
  private readonly itemLoadingSubject = new BehaviorSubject<boolean>(false);

  readonly macroevents$ = this.macroeventsSubject.asObservable();
  readonly filteredMacroevents$ =
    this.filteredMacroeventsSubject.asObservable();
  readonly selectedMacroevent$ = this.selectedMacroeventSubject.asObservable();
  readonly isLoadingList$ = this.listLoadingSubject.asObservable();
  readonly isLoadingItem$ = this.itemLoadingSubject.asObservable();

  private currentFilter: number | null = null;

  // ───────── LISTA ─────────
  loadAllMacroevents(): void {
    this.loadMacroevents(this.macroeventsService.getMacroevents(), null);
  }

  loadMacroeventsByYear(year: number): void {
    this.loadMacroevents(
      this.macroeventsService.getMacroeventsByYear(year),
      year
    );
  }

  private loadMacroevents(
    request$: Observable<MacroeventModelFullData[]>,
    year: number | null
  ): void {
    this.setCurrentFilter(year);
    this.listLoadingSubject.next(true);
    request$
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        tap((macroevents) => this.updateMacroeventState(macroevents)),
        this.handleErrorAndFinalizeList()
      )
      .subscribe();
  }

  // ───────── ITEM ─────────
  loadMacroeventById(id: number): void {
    this.itemLoadingSubject.next(true);
    this.macroeventsService
      .getMacroeventById(id)
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        tap((macro) => this.selectedMacroeventSubject.next(macro)),
        this.handleErrorAndFinalizeItem()
      )
      .subscribe();
  }

  getMacroeventByIdOnce(id: number): Observable<MacroeventModelFullData> {
    return this.macroeventsService.getMacroeventByIdOnce(id).pipe(take(1));
  }

  prefetchMacroeventById(id: number): void {
    this.macroeventsService
      .getMacroeventById(id)
      .pipe(
        take(1),
        catchError(() => EMPTY)
      )
      .subscribe();
  }

  // ───────── CRUD ─────────
  addMacroevent(fd: FormData): Observable<MacroeventModelFullData> {
    this.itemLoadingSubject.next(true);
    return this.macroeventsService.add(fd).pipe(
      takeUntilDestroyed(this.destroyRef),
      tap(() => this.reloadCurrentFiltered()),
      this.handleErrorAndFinalizeItem(true)
    );
  }

  editMacroevent(fd: FormData): Observable<MacroeventModelFullData> {
    this.itemLoadingSubject.next(true);
    return this.macroeventsService.edit(fd).pipe(
      takeUntilDestroyed(this.destroyRef),
      tap(() => this.reloadCurrentFiltered()),
      this.handleErrorAndFinalizeItem(true)
    );
  }

  deleteMacroevent(id: number): void {
    this.itemLoadingSubject.next(true);
    this.macroeventsService
      .delete(id)
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        tap(() => this.reloadCurrentFiltered()),
        this.handleErrorAndFinalizeItem()
      )
      .subscribe();
  }

  // ───────── HELPERS ─────────
  applyFilterWord(keyword: string): void {
    const all = this.macroeventsSubject.getValue();
    this.filteredMacroeventsSubject.next(
      filterByKeyword(all, keyword, (e) => e.title ?? '')
    );
  }

  clearSelectedMacroevent(): void {
    this.selectedMacroeventSubject.next(null);
  }

  private setCurrentFilter(year: number | null): void {
    this.currentFilter = year;
  }

  private reloadCurrentFiltered(): void {
    this.currentFilter === null
      ? this.loadAllMacroevents()
      : this.loadMacroeventsByYear(this.currentFilter);
  }

  private updateMacroeventState(macroevents: MacroeventModelFullData[]): void {
    this.macroeventsSubject.next(macroevents);
    this.filteredMacroeventsSubject.next(macroevents);
  }

  // ───────── Error/Finalize handlers ─────────
  private handleErrorAndFinalizeList<T>(emitEmpty = true) {
    return (src: Observable<T>) =>
      src.pipe(
        catchError((err) => {
          this.generalService.handleHttpError(err);
          if (emitEmpty) {
            this.macroeventsSubject.next([]);
            this.filteredMacroeventsSubject.next([]);
          }
          return EMPTY;
        }),
        finalize(() => this.listLoadingSubject.next(false))
      );
  }

  private handleErrorAndFinalizeItem<T>(emitEmpty = false) {
    return (src: Observable<T>) =>
      src.pipe(
        catchError((err) => {
          this.generalService.handleHttpError(err);
          if (emitEmpty) this.selectedMacroeventSubject.next(null);
          return EMPTY;
        }),
        finalize(() => this.itemLoadingSubject.next(false))
      );
  }
}
