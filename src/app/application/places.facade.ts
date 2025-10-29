import { inject, Injectable } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { BehaviorSubject, EMPTY, Observable } from 'rxjs';
import { catchError, finalize, map, tap } from 'rxjs/operators';
import { PlaceModel } from 'src/app/core/interfaces/place.interface';
import { PlacesService } from 'src/app/core/services/places.services';
import { includesNormalized, toSearchKey } from '../shared/utils/text.utils';
import { LoadableFacade } from './loadable.facade';

@Injectable({ providedIn: 'root' })
export class PlacesFacade extends LoadableFacade {
  private readonly placesService = inject(PlacesService);

  // ───────── STATE ─────────
  private readonly placesSubject = new BehaviorSubject<PlaceModel[] | null>(
    null
  );
  private readonly filteredPlacesSubject = new BehaviorSubject<
    PlaceModel[] | null
  >(null);
  private readonly selectedPlaceSubject =
    new BehaviorSubject<PlaceModel | null>(null);

  private readonly listLoadingSubject = new BehaviorSubject<boolean>(false);
  private readonly itemLoadingSubject = new BehaviorSubject<boolean>(false);

  // ───────── PUBLIC STREAMS ─────────
  readonly places$ = this.placesSubject.asObservable();
  readonly filteredPlaces$ = this.filteredPlacesSubject.asObservable();
  readonly selectedPlace$ = this.selectedPlaceSubject.asObservable();
  readonly isLoadingList$ = this.listLoadingSubject.asObservable();
  readonly isLoadingItem$ = this.itemLoadingSubject.asObservable();

  // ───────── LISTAS → isLoadingList$ ─────────
  loadAllPlaces(): void {
    this.listLoadingSubject.next(true);

    this.placesService
      .getPlaces()
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        tap((places) => this.updatePlaceState(places)),
        catchError((err) => {
          this.generalService.handleHttpError(err);
          return EMPTY;
        }),
        finalize(() => this.listLoadingSubject.next(false))
      )
      .subscribe();
  }

  loadPlacesByManagement(management: string): void {
    this.listLoadingSubject.next(true);

    this.placesService
      .getPlacesByManagement(management)
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        tap((places) => this.updatePlaceState(places)),
        catchError((err) => {
          this.generalService.handleHttpError(err);
          return EMPTY;
        }),
        finalize(() => this.listLoadingSubject.next(false))
      )
      .subscribe();
  }

  loadPlacesByType(type: string): void {
    this.listLoadingSubject.next(true);

    this.placesService
      .getPlacesByType(type)
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        tap((places) => this.updatePlaceState(places)),
        catchError((err) => {
          this.generalService.handleHttpError(err);
          return EMPTY;
        }),
        finalize(() => this.listLoadingSubject.next(false))
      )
      .subscribe();
  }

  /**
   * Útil para modales o listas dependientes.
   * No actualiza el estado global para evitar recargas no deseadas.
   */
  loadPlacesByTown(town: string): Observable<PlaceModel[]> {
    this.itemLoadingSubject.next(true);

    return this.placesService.getPlacesByTown(town).pipe(
      takeUntilDestroyed(this.destroyRef),
      catchError((err) => {
        this.generalService.handleHttpError(err);
        return EMPTY;
      }),
      finalize(() => this.itemLoadingSubject.next(false))
    );
  }

  loadSalasForPlace(
    placeId: number,
    salaId?: number
  ): Observable<{ salas: any[]; selectedSala?: any }> {
    return this.placesService.getSalasByPlaceId(placeId).pipe(
      map((salas) => {
        const selectedSala = salaId
          ? salas.find((s) => s.sala_id === salaId)
          : undefined;
        return { salas, selectedSala };
      })
    );
  }

  // ───────── ITEM → isLoadingItem$ ─────────
  loadPlaceById(id: number): void {
    this.itemLoadingSubject.next(true);

    this.placesService
      .getPlaceById(id)
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        tap((place) => this.selectedPlaceSubject.next(place)),
        catchError((err) => {
          this.generalService.handleHttpError(err);
          return EMPTY;
        }),
        finalize(() => this.itemLoadingSubject.next(false))
      )
      .subscribe();
  }

  // ───────── CRUD ─────────
  addPlace(place: FormData): Observable<FormData> {
    this.itemLoadingSubject.next(true);

    return this.placesService.add(place).pipe(
      takeUntilDestroyed(this.destroyRef),
      tap(() => this.loadAllPlaces()),
      catchError((err) => {
        this.generalService.handleHttpError(err);
        return EMPTY;
      }),
      finalize(() => this.itemLoadingSubject.next(false))
    );
  }

  editPlace(place: FormData): Observable<FormData> {
    this.itemLoadingSubject.next(true);

    return this.placesService.edit(place).pipe(
      takeUntilDestroyed(this.destroyRef),
      tap(() => this.loadAllPlaces()),
      catchError((err) => {
        this.generalService.handleHttpError(err);
        return EMPTY;
      }),
      finalize(() => this.itemLoadingSubject.next(false))
    );
  }

  deletePlace(id: number): void {
    this.itemLoadingSubject.next(true);

    this.placesService
      .delete(id)
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        tap(() => this.loadAllPlaces()),
        catchError((err) => {
          this.generalService.handleHttpError(err);
          return EMPTY;
        }),
        finalize(() => this.itemLoadingSubject.next(false))
      )
      .subscribe();
  }

  // ───────── HELPERS ─────────
  clearSelectedPlace(): void {
    this.selectedPlaceSubject.next(null);
  }

  applyFilterWord(keyword: string): void {
    const all = this.placesSubject.getValue();

    if (!all) {
      this.filteredPlacesSubject.next(all);
      return;
    }

    if (!toSearchKey(keyword)) {
      this.filteredPlacesSubject.next(all);
      return;
    }

    const filtered = all.filter((place) =>
      [place.name].some((field) => includesNormalized(field, keyword))
    );

    this.filteredPlacesSubject.next(filtered);
  }

  // ───────── PRIVATE ─────────
  private updatePlaceState(places: PlaceModel[]): void {
    const sorted = [...places].sort((a, b) => a.name.localeCompare(b.name));
    this.placesSubject.next(sorted);
    this.filteredPlacesSubject.next(sorted);
  }
}
