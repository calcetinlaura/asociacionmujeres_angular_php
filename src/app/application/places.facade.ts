import { inject, Injectable } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { BehaviorSubject, catchError, map, Observable, tap } from 'rxjs';
import { PlaceModel } from 'src/app/core/interfaces/place.interface';
import { PlacesService } from 'src/app/core/services/places.services';
import { includesNormalized, toSearchKey } from '../shared/utils/text.utils';
import { LoadableFacade } from './loadable.facade';

@Injectable({ providedIn: 'root' })
export class PlacesFacade extends LoadableFacade {
  private readonly placesService = inject(PlacesService);

  // State
  private readonly placesSubject = new BehaviorSubject<PlaceModel[] | null>(
    null
  );
  private readonly filteredPlacesSubject = new BehaviorSubject<
    PlaceModel[] | null
  >(null);
  private readonly selectedPlaceSubject =
    new BehaviorSubject<PlaceModel | null>(null);

  // Streams públicos
  readonly places$ = this.placesSubject.asObservable();
  readonly filteredPlaces$ = this.filteredPlacesSubject.asObservable();
  readonly selectedPlace$ = this.selectedPlaceSubject.asObservable();

  loadAllPlaces(): void {
    this.executeWithLoading(this.placesService.getPlaces(), (places) =>
      this.updatePlaceState(places)
    );
  }

  loadPlacesByManagement(management: string): void {
    this.executeWithLoading(
      this.placesService.getPlacesByManagement(management),
      (places) => this.updatePlaceState(places)
    );
  }

  loadPlacesByType(type: string): void {
    this.executeWithLoading(
      this.placesService.getPlacesByType(type),
      (places) => this.updatePlaceState(places)
    );
  }

  /** Devuelve el stream (útil para modales/listas dependientes); controla loading y errores. */
  loadPlacesByTown(town: string): Observable<PlaceModel[]> {
    return this.wrapWithLoading(this.placesService.getPlacesByTown(town)).pipe(
      takeUntilDestroyed(this.destroyRef),
      tap((places) => this.updatePlaceState(places)),
      catchError((err) => this.generalService.handleHttpError(err))
    );
  }

  loadSalasForPlace(
    placeId: number,
    salaId?: number
  ): Observable<{
    salas: any[];
    selectedSala?: any;
  }> {
    return this.placesService.getSalasByPlaceId(placeId).pipe(
      map((salas) => {
        const selectedSala = salaId
          ? salas.find((s) => s.sala_id === salaId)
          : undefined;

        return { salas, selectedSala };
      })
    );
  }

  loadPlaceById(id: number): void {
    this.executeWithLoading(this.placesService.getPlaceById(id), (place) =>
      this.selectedPlaceSubject.next(place)
    );
  }

  addPlace(place: FormData): Observable<FormData> {
    return this.wrapWithLoading(this.placesService.add(place)).pipe(
      takeUntilDestroyed(this.destroyRef),
      tap(() => this.loadAllPlaces()),
      catchError((err) => this.generalService.handleHttpError(err))
    );
  }

  editPlace(place: FormData): Observable<FormData> {
    return this.wrapWithLoading(this.placesService.edit(place)).pipe(
      takeUntilDestroyed(this.destroyRef),
      tap(() => this.loadAllPlaces()),
      catchError((err) => this.generalService.handleHttpError(err))
    );
  }

  deletePlace(id: number): void {
    this.executeWithLoading(this.placesService.delete(id), () =>
      this.loadAllPlaces()
    );
  }

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

  private updatePlaceState(places: PlaceModel[]): void {
    const sorted = [...places].sort((a, b) => a.name.localeCompare(b.name));
    this.placesSubject.next(sorted);
    this.filteredPlacesSubject.next(sorted);
  }
}
