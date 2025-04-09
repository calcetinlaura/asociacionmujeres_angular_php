import { DestroyRef, inject, Injectable } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { BehaviorSubject, catchError, Observable, tap } from 'rxjs';
import { PiteraModel } from 'src/app/core/interfaces/pitera.interface';
import { PiterasService } from 'src/app/core/services/piteras.services';
import { GeneralService } from '../shared/services/generalService.service';

@Injectable({
  providedIn: 'root',
})
export class PiterasFacade {
  private readonly destroyRef = inject(DestroyRef);
  private readonly piterasService = inject(PiterasService);
  private readonly generalService = inject(GeneralService);
  private readonly piterasSubject = new BehaviorSubject<PiteraModel[] | null>(
    null
  );
  private readonly filteredPiterasSubject = new BehaviorSubject<
    PiteraModel[] | null
  >(null);
  private readonly selectedPiterasSubject =
    new BehaviorSubject<PiteraModel | null>(null);
  piteras$ = this.piterasSubject.asObservable();
  selectedPitera$ = this.selectedPiterasSubject.asObservable();
  filteredPiteras$ = this.filteredPiterasSubject.asObservable();

  constructor() {}

  loadAllPiteras(): void {
    this.piterasService
      .getPiteras()
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        tap((piteras: PiteraModel[]) => this.updatePiteraState(piteras)),
        catchError((err) => this.generalService.handleHttpError(err))
      )
      .subscribe();
  }

  loadPiteraById(id: number): void {
    this.piterasService
      .getPiteraById(id)
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        tap((pitera: PiteraModel) => this.selectedPiterasSubject.next(pitera)),
        catchError((err) => this.generalService.handleHttpError(err))
      )
      .subscribe();
  }

  addPitera(pitera: FormData): Observable<FormData> {
    return this.piterasService.add(pitera).pipe(
      takeUntilDestroyed(this.destroyRef),
      tap(() => this.loadAllPiteras()),
      catchError((err) => this.generalService.handleHttpError(err))
    );
  }

  editPitera(itemId: number, pitera: FormData): Observable<FormData> {
    return this.piterasService.edit(itemId, pitera).pipe(
      takeUntilDestroyed(this.destroyRef),
      tap(() => this.loadAllPiteras()),
      catchError((err) => this.generalService.handleHttpError(err))
    );
  }

  deletePitera(id: number): void {
    this.piterasService
      .delete(id)
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        tap(() => this.loadAllPiteras()),
        catchError((err) => this.generalService.handleHttpError(err))
      )
      .subscribe();
  }

  clearSelectedPitera(): void {
    this.selectedPiterasSubject.next(null);
  }

  applyFilterWord(keyword: string): void {
    const allPiteras = this.piterasSubject.getValue();

    if (!keyword.trim() || !allPiteras) {
      this.filteredPiterasSubject.next(allPiteras);
      return;
    }
    const search = keyword.trim().toLowerCase();
    const filteredPiteras = allPiteras.filter(
      (pitera) =>
        pitera.title.toLowerCase().includes(search) ||
        (pitera.theme && pitera.theme.toLowerCase().includes(search))
    );

    this.filteredPiterasSubject.next(filteredPiteras);
  }

  updatePiteraState(piteras: PiteraModel[]): void {
    this.piterasSubject.next(piteras);
    this.filteredPiterasSubject.next(piteras);
  }
}
