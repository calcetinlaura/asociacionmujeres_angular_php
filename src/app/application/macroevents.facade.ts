import { DestroyRef, inject, Injectable } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { BehaviorSubject, catchError, Observable, tap } from 'rxjs';
import { MacroeventsService } from 'src/app/core/services/macroevents.services';
import { MacroeventModelFullData } from '../core/interfaces/macroevent.interface';
import { GeneralService } from '../shared/services/generalService.service';

@Injectable({
  providedIn: 'root',
})
export class MacroeventsFacade {
  private readonly destroyRef = inject(DestroyRef);
  private readonly macroeventsService = inject(MacroeventsService);
  private readonly generalService = inject(GeneralService);
  private readonly macroeventsSubject = new BehaviorSubject<
    MacroeventModelFullData[] | null
  >(null);
  private readonly filteredMacroeventsSubject = new BehaviorSubject<
    MacroeventModelFullData[] | null
  >(null);
  private readonly selectedMacroeventSubject =
    new BehaviorSubject<MacroeventModelFullData | null>(null);

  macroevents$ = this.macroeventsSubject.asObservable();
  filteredMacroevents$ = this.filteredMacroeventsSubject.asObservable();
  selectedMacroevent$ = this.selectedMacroeventSubject.asObservable();
  currentYear: number | null = null;
  currentFilter: number | null = null;

  constructor() {}

  setCurrentFilter(year: number | null): void {
    this.currentFilter = year;
  }

  private reloadCurrentFilteredYear(): void {
    if (this.currentFilter !== null) {
      this.loadMacroeventsByYear(this.currentFilter);
    } else {
      this.loadAllMacroevents();
    }
  }

  loadAllMacroevents(): void {
    this.macroeventsService
      .getMacroevents()
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        tap((macroevents) => {
          this.updateMacroeventState(macroevents);
        }),
        catchError((err) => this.generalService.handleHttpError(err))
      )
      .subscribe();
  }

  setCurrentYear(year: number): void {
    this.currentYear = year;
  }

  loadMacroeventsByYear(year: number): void {
    this.setCurrentFilter(year);

    this.macroeventsService
      .getMacroeventsByYear(year)
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        tap((macroevents: MacroeventModelFullData[]) =>
          this.updateMacroeventState(macroevents)
        ),
        catchError((err) => this.generalService.handleHttpError(err))
      )
      .subscribe();
  }

  loadMacroeventById(id: number): void {
    this.macroeventsService
      .getMacroeventById(id)
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        tap((event) => this.selectedMacroeventSubject.next(event)),
        catchError((err) => this.generalService.handleHttpError(err))
      )
      .subscribe();
  }

  editMacroevent(itemId: number, event: FormData): Observable<FormData> {
    return this.macroeventsService.edit(itemId, event).pipe(
      takeUntilDestroyed(this.destroyRef),
      tap(() => this.reloadCurrentFilteredYear()),
      catchError((err) => this.generalService.handleHttpError(err))
    );
  }

  addMacroevent(event: FormData): Observable<FormData> {
    return this.macroeventsService.add(event).pipe(
      takeUntilDestroyed(this.destroyRef),
      tap(() => this.reloadCurrentFilteredYear()),
      catchError((err) => this.generalService.handleHttpError(err))
    );
  }

  deleteMacroevent(id: number): void {
    this.macroeventsService
      .delete(id)
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        tap(() => this.reloadCurrentFilteredYear()),
        catchError((err) => this.generalService.handleHttpError(err))
      )
      .subscribe();
  }

  clearSelectedMacroevent(): void {
    this.selectedMacroeventSubject.next(null);
  }

  applyFilterWord(keyword: string): void {
    const allMacroevents = this.macroeventsSubject.getValue();

    if (!keyword.trim() || !allMacroevents) {
      this.filteredMacroeventsSubject.next(allMacroevents);
      return;
    }
    const search = keyword.trim().toLowerCase();

    const filteredMacroevents = allMacroevents.filter((event) =>
      event.title.toLowerCase().includes(search)
    );

    this.filteredMacroeventsSubject.next(filteredMacroevents);
  }

  private updateMacroeventState(macroevents: MacroeventModelFullData[]): void {
    this.macroeventsSubject.next(macroevents);
    this.filteredMacroeventsSubject.next(macroevents);
  }
}
