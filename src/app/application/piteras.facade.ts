import { inject, Injectable } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { BehaviorSubject, catchError, finalize, Observable, tap } from 'rxjs';
import { PiteraModel } from 'src/app/core/interfaces/pitera.interface';
import { PiterasService } from 'src/app/core/services/piteras.services';
import { includesNormalized, toSearchKey } from '../shared/utils/text.utils';
import { LoadableFacade } from './loadable.facade';

@Injectable({ providedIn: 'root' })
export class PiterasFacade extends LoadableFacade {
  private readonly piterasService = inject(PiterasService);

  // State propio
  private readonly piterasSubject = new BehaviorSubject<PiteraModel[] | null>(
    null
  );
  private readonly filteredPiterasSubject = new BehaviorSubject<
    PiteraModel[] | null
  >(null);
  private readonly selectedPiteraSubject =
    new BehaviorSubject<PiteraModel | null>(null);

  // NEW: loaders separados
  private readonly listLoadingSubject = new BehaviorSubject<boolean>(false);
  private readonly itemLoadingSubject = new BehaviorSubject<boolean>(false);

  // Streams públicos
  readonly piteras$ = this.piterasSubject.asObservable();
  readonly filteredPiteras$ = this.filteredPiterasSubject.asObservable();
  readonly selectedPitera$ = this.selectedPiteraSubject.asObservable();

  // NEW: usa estos en la UI
  readonly isLoadingList$ = this.listLoadingSubject.asObservable();
  readonly isLoadingItem$ = this.itemLoadingSubject.asObservable();

  // ---------- API pública

  loadAllPiteras(): void {
    this.listLoadingSubject.next(true);
    this.piterasService
      .getPiteras()
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        catchError((err) => this.generalService.handleHttpError(err)),
        finalize(() => this.listLoadingSubject.next(false))
      )
      .subscribe((piteras) => this.updatePiteraState(piteras));
  }

  loadPiteraById(id: number): void {
    this.itemLoadingSubject.next(true);
    this.piterasService
      .getPiteraById(id)
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        catchError((err) => this.generalService.handleHttpError(err)),
        finalize(() => this.itemLoadingSubject.next(false))
      )
      .subscribe((pitera) => this.selectedPiteraSubject.next(pitera));
  }

  addPitera(pitera: FormData): Observable<FormData> {
    this.itemLoadingSubject.next(true);
    return this.piterasService.add(pitera).pipe(
      takeUntilDestroyed(this.destroyRef),
      tap(() => this.loadAllPiteras()),
      catchError((err) => this.generalService.handleHttpError(err)),
      finalize(() => this.itemLoadingSubject.next(false))
    );
  }

  editPitera(pitera: FormData): Observable<FormData> {
    this.itemLoadingSubject.next(true);
    return this.piterasService.edit(pitera).pipe(
      takeUntilDestroyed(this.destroyRef),
      tap(() => this.loadAllPiteras()),
      catchError((err) => this.generalService.handleHttpError(err)),
      finalize(() => this.itemLoadingSubject.next(false))
    );
  }

  deletePitera(id: number): void {
    this.itemLoadingSubject.next(true);
    this.piterasService
      .delete(id)
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        catchError((err) => this.generalService.handleHttpError(err)),
        finalize(() => this.itemLoadingSubject.next(false))
      )
      .subscribe(() => this.loadAllPiteras());
  }

  clearSelectedPitera(): void {
    this.selectedPiteraSubject.next(null);
  }

  applyFilterWord(keyword: string): void {
    const all = this.piterasSubject.getValue();
    if (!all) {
      this.filteredPiterasSubject.next(all);
      return;
    }
    if (!toSearchKey(keyword)) {
      this.filteredPiterasSubject.next(all);
      return;
    }

    const filtered = all.filter((p) =>
      [p.title, p.theme].some((field) => includesNormalized(field, keyword))
    );
    this.filteredPiterasSubject.next(filtered);
  }

  // ---------- Privado / utilidades
  private updatePiteraState(piteras: PiteraModel[]): void {
    this.piterasSubject.next(piteras);
    this.filteredPiterasSubject.next(piteras);
  }
}
