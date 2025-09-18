import { inject, Injectable } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { BehaviorSubject, catchError, Observable, tap } from 'rxjs';
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

  // Streams públicos
  readonly macroevents$ = this.macroeventsSubject.asObservable();
  readonly filteredMacroevents$ =
    this.filteredMacroeventsSubject.asObservable();
  readonly selectedMacroevent$ = this.selectedMacroeventSubject.asObservable();

  private currentFilter: number | null = null; // año actual aplicado (o null => todos)

  loadAllMacroevents(): void {
    this.setCurrentFilter(null);
    this.executeWithLoading(
      this.macroeventsService.getMacroevents(),
      (macroevents) => this.updateMacroeventState(macroevents)
    );
  }

  loadMacroeventsByYear(year: number): void {
    this.setCurrentFilter(year);
    this.executeWithLoading(
      this.macroeventsService.getMacroeventsByYear(year),
      (macroevents) => this.updateMacroeventState(macroevents)
    );
  }

  loadMacroeventById(id: number): void {
    this.executeWithLoading(
      this.macroeventsService.getMacroeventById(id),
      (event) => this.selectedMacroeventSubject.next(event)
    );
  }

  addMacroevent(event: FormData): Observable<FormData> {
    return this.wrapWithLoading(this.macroeventsService.add(event)).pipe(
      takeUntilDestroyed(this.destroyRef),
      tap(() => this.reloadCurrentFiltered()),
      catchError((err) => this.generalService.handleHttpError(err))
    );
  }

  editMacroevent(event: FormData): Observable<FormData> {
    return this.wrapWithLoading(this.macroeventsService.edit(event)).pipe(
      takeUntilDestroyed(this.destroyRef),
      tap(() => this.reloadCurrentFiltered()),
      catchError((err) => this.generalService.handleHttpError(err))
    );
  }

  deleteMacroevent(id: number): void {
    this.executeWithLoading(this.macroeventsService.delete(id), () =>
      this.reloadCurrentFiltered()
    );
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
