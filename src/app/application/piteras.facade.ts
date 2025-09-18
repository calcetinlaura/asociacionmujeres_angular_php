import { inject, Injectable } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { BehaviorSubject, catchError, Observable, tap } from 'rxjs';
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

  // Streams públicos
  readonly piteras$ = this.piterasSubject.asObservable();
  readonly filteredPiteras$ = this.filteredPiterasSubject.asObservable();
  readonly selectedPitera$ = this.selectedPiteraSubject.asObservable();

  // ---------- API pública

  loadAllPiteras(): void {
    this.executeWithLoading(this.piterasService.getPiteras(), (piteras) =>
      this.updatePiteraState(piteras)
    );
  }

  loadPiteraById(id: number): void {
    this.executeWithLoading(this.piterasService.getPiteraById(id), (pitera) =>
      this.selectedPiteraSubject.next(pitera)
    );
  }

  addPitera(pitera: FormData): Observable<FormData> {
    return this.wrapWithLoading(this.piterasService.add(pitera)).pipe(
      takeUntilDestroyed(this.destroyRef),
      tap(() => this.loadAllPiteras()),
      catchError((err) => this.generalService.handleHttpError(err))
    );
  }

  editPitera(pitera: FormData): Observable<FormData> {
    return this.wrapWithLoading(this.piterasService.edit(pitera)).pipe(
      takeUntilDestroyed(this.destroyRef),
      tap(() => this.loadAllPiteras()),
      catchError((err) => this.generalService.handleHttpError(err))
    );
  }

  deletePitera(id: number): void {
    this.executeWithLoading(this.piterasService.delete(id), () =>
      this.loadAllPiteras()
    );
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
