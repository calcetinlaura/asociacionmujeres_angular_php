import { DestroyRef, inject, Injectable } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { BehaviorSubject, catchError, map, Observable, tap } from 'rxjs';
import { PlaceModel } from 'src/app/core/interfaces/place.interface';
import { PlacesService } from 'src/app/core/services/places.services';
import { GeneralService } from '../shared/services/generalService.service';

@Injectable({
  providedIn: 'root',
})
export class PlacesFacade {
  private readonly destroyRef = inject(DestroyRef);
  private readonly placesService = inject(PlacesService);
  private readonly generalService = inject(GeneralService);
  private readonly placesSubject = new BehaviorSubject<PlaceModel[] | null>(
    null
  );
  private readonly filteredPlacesSubject = new BehaviorSubject<
    PlaceModel[] | null
  >(null);
  private readonly selectedPlaceSubject =
    new BehaviorSubject<PlaceModel | null>(null);
  places$ = this.placesSubject.asObservable();
  selectedPlace$ = this.selectedPlaceSubject.asObservable();
  filteredPlaces$ = this.filteredPlacesSubject.asObservable();

  constructor() {}

  loadAllPlaces(): void {
    this.placesService
      .getPlaces()
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        tap((places: PlaceModel[]) => this.updatePlaceState(places)),
        catchError((err) => this.generalService.handleHttpError(err))
      )
      .subscribe();
  }

  loadPlacesByManagement(management: string): void {
    this.placesService
      .getPlacesByManagement(management)
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        tap((places: PlaceModel[]) => this.updatePlaceState(places)),
        catchError((err) => this.generalService.handleHttpError(err))
      )
      .subscribe();
  }

  loadPlacesByTown(type: string): Observable<PlaceModel[]> {
    return this.placesService.getPlacesByTown(type).pipe(
      tap((places: PlaceModel[]) => this.updatePlaceState(places)),
      catchError((err) => this.generalService.handleHttpError(err))
    );
  }

  loadPlacesByType(type: string): void {
    this.placesService
      .getPlacesByType(type)
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        tap((places: PlaceModel[]) => this.updatePlaceState(places)),
        catchError((err) => this.generalService.handleHttpError(err))
      )
      .subscribe();
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
    this.placesService
      .getPlaceById(id)
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        tap((place: PlaceModel) => this.selectedPlaceSubject.next(place)),
        catchError((err) => this.generalService.handleHttpError(err))
      )
      .subscribe();
  }

  addPlace(place: FormData): Observable<FormData> {
    return this.placesService.add(place).pipe(
      takeUntilDestroyed(this.destroyRef),
      tap(() => this.loadAllPlaces()),
      catchError((err) => this.generalService.handleHttpError(err))
    );
  }

  editPlace(itemId: number, place: FormData): Observable<FormData> {
    return this.placesService.edit(itemId, place).pipe(
      takeUntilDestroyed(this.destroyRef),
      tap(() => this.loadAllPlaces()),
      catchError((err) => this.generalService.handleHttpError(err))
    );
  }

  deletePlace(id: number): void {
    this.placesService
      .delete(id)
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        tap(() => this.loadAllPlaces()),
        catchError((err) => this.generalService.handleHttpError(err))
      )
      .subscribe();
  }

  clearSelectedPlace(): void {
    this.selectedPlaceSubject.next(null);
  }

  applyFilterWord(keyword: string): void {
    const allPlaces = this.placesSubject.getValue();

    if (!keyword.trim() || !allPlaces) {
      this.filteredPlacesSubject.next(allPlaces);
      return;
    }
    const search = keyword.trim().toLowerCase();
    const filteredPlaces = allPlaces.filter((place) =>
      place.name.toLowerCase().includes(search)
    );

    this.filteredPlacesSubject.next(filteredPlaces);
  }

  updatePlaceState(places: PlaceModel[]): void {
    const sortedPlaces = [...places].sort((a, b) =>
      a.name.localeCompare(b.name)
    );
    this.placesSubject.next(sortedPlaces);
    this.filteredPlacesSubject.next(sortedPlaces);
  }
}
