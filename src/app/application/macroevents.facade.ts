import { inject, Injectable } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { BehaviorSubject, catchError, finalize, Observable, tap } from 'rxjs';
import { MacroeventModelFullData } from 'src/app/core/interfaces/macroevent.interface';
import { MacroeventsService } from 'src/app/core/services/macroevents.services';
import { includesNormalized, toSearchKey } from '../shared/utils/text.utils';
import { LoadableFacade } from './loadable.facade';

@Injectable({ providedIn: 'root' })
export class MacroeventsFacade extends LoadableFacade {
  private readonly macroeventsService = inject(MacroeventsService);

  // State propio
  private readonly macroeventsSubject = new BehaviorSubject<
    MacroeventModelFullData[] | null
  >(null);
  private readonly filteredMacroeventsSubject = new BehaviorSubject<
    MacroeventModelFullData[] | null
  >(null);
  private readonly selectedMacroeventSubject =
    new BehaviorSubject<MacroeventModelFullData | null>(null);

  // NEW: loaders separados
  private readonly listLoadingSubject = new BehaviorSubject<boolean>(false);
  private readonly itemLoadingSubject = new BehaviorSubject<boolean>(false);

  // Streams públicos
  readonly macroevents$ = this.macroeventsSubject.asObservable();
  readonly filteredMacroevents$ =
    this.filteredMacroeventsSubject.asObservable();
  readonly selectedMacroevent$ = this.selectedMacroeventSubject.asObservable();

  // NEW: usa estos en la UI
  readonly isLoadingList$ = this.listLoadingSubject.asObservable();
  readonly isLoadingItem$ = this.itemLoadingSubject.asObservable();

  private currentFilter: number | null = null; // año actual aplicado (o null => todos)

  // ─────────── LISTA → isLoadingList$
  loadAllMacroevents(): void {
    this.setCurrentFilter(null);
    this.listLoadingSubject.next(true);
    this.macroeventsService
      .getMacroevents()
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        catchError((err) => this.generalService.handleHttpError(err)),
        finalize(() => this.listLoadingSubject.next(false))
      )
      .subscribe((macroevents) => this.updateMacroeventState(macroevents));
  }

  loadMacroeventsByYear(year: number): void {
    this.setCurrentFilter(year);
    this.listLoadingSubject.next(true);
    this.macroeventsService
      .getMacroeventsByYear(year)
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        catchError((err) => this.generalService.handleHttpError(err)),
        finalize(() => this.listLoadingSubject.next(false))
      )
      .subscribe((macroevents) => this.updateMacroeventState(macroevents));
  }

  // ─────────── ITEM → isLoadingItem$
  loadMacroeventById(id: number): void {
    this.itemLoadingSubject.next(true);
    this.macroeventsService
      .getMacroeventById(id)
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        catchError((err) => this.generalService.handleHttpError(err)),
        finalize(() => this.itemLoadingSubject.next(false))
      )
      .subscribe((event) => this.selectedMacroeventSubject.next(event));
  }

  addMacroevent(event: FormData): Observable<FormData> {
    this.itemLoadingSubject.next(true);
    return this.macroeventsService.add(event).pipe(
      takeUntilDestroyed(this.destroyRef),
      tap(() => this.reloadCurrentFiltered()),
      catchError((err) => this.generalService.handleHttpError(err)),
      finalize(() => this.itemLoadingSubject.next(false))
    );
  }

  editMacroevent(event: FormData): Observable<FormData> {
    this.itemLoadingSubject.next(true);
    return this.macroeventsService.edit(event).pipe(
      takeUntilDestroyed(this.destroyRef),
      tap(() => this.reloadCurrentFiltered()),
      catchError((err) => this.generalService.handleHttpError(err)),
      finalize(() => this.itemLoadingSubject.next(false))
    );
  }

  deleteMacroevent(id: number): void {
    this.itemLoadingSubject.next(true);
    this.macroeventsService
      .delete(id)
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        catchError((err) => this.generalService.handleHttpError(err)),
        finalize(() => this.itemLoadingSubject.next(false))
      )
      .subscribe(() => this.reloadCurrentFiltered());
  }

  clearSelectedMacroevent(): void {
    this.selectedMacroeventSubject.next(null);
  }

  applyFilterWord(keyword: string): void {
    const all = this.macroeventsSubject.getValue();
    if (!all) {
      this.filteredMacroeventsSubject.next(all);
      return;
    }
    if (!toSearchKey(keyword)) {
      this.filteredMacroeventsSubject.next(all);
      return;
    }

    const filtered = all.filter((e) =>
      [e.title].some((field) => includesNormalized(field, keyword))
    );
    this.filteredMacroeventsSubject.next(filtered);
  }

  setCurrentFilter(year: number | null): void {
    this.currentFilter = year;
  }

  private reloadCurrentFiltered(): void {
    if (this.currentFilter === null) {
      this.loadAllMacroevents();
      return;
    }
    this.loadMacroeventsByYear(this.currentFilter);
  }

  private updateMacroeventState(macroevents: MacroeventModelFullData[]): void {
    this.macroeventsSubject.next(macroevents);
    this.filteredMacroeventsSubject.next(macroevents);
  }
}
