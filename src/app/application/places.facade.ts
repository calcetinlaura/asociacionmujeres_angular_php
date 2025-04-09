import { HttpErrorResponse } from '@angular/common/http';
import { DestroyRef, inject, Injectable } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import {
  BehaviorSubject,
  catchError,
  map,
  Observable,
  tap,
  throwError,
} from 'rxjs';
import { PlaceModel } from 'src/app/core/interfaces/place.interface';
import { PlacesService } from 'src/app/core/services/places.services';

@Injectable({
  providedIn: 'root',
})
export class PlacesFacade {
  private readonly destroyRef = inject(DestroyRef);
  private readonly placesService = inject(PlacesService);
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
        catchError(this.handleError)
      )
      .subscribe();
  }

  loadPlacesByManagement(management: string): void {
    this.placesService
      .getPlacesByManagement(management)
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        tap((places: PlaceModel[]) => this.updatePlaceState(places)),
        catchError(this.handleError)
      )
      .subscribe();
  }

  loadPlacesByTown(type: string): Observable<PlaceModel[]> {
    return this.placesService.getPlacesByTown(type).pipe(
      tap((places: PlaceModel[]) => this.updatePlaceState(places)),
      catchError(this.handleError)
    );
  }

  loadPlacesByType(type: string): void {
    this.placesService
      .getPlacesByType(type)
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        tap((places: PlaceModel[]) => this.updatePlaceState(places)),
        catchError(this.handleError)
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
        catchError(this.handleError)
      )
      .subscribe();
  }

  addPlace(place: FormData): Observable<FormData> {
    return this.placesService.add(place).pipe(
      takeUntilDestroyed(this.destroyRef),
      tap(() => this.loadAllPlaces()),
      catchError(this.handleError)
    );
  }

  editPlace(itemId: number, place: FormData): Observable<FormData> {
    return this.placesService.edit(itemId, place).pipe(
      takeUntilDestroyed(this.destroyRef),
      tap(() => this.loadAllPlaces()),
      catchError(this.handleError)
    );
  }

  deletePlace(id: number): void {
    this.placesService
      .delete(id)
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        tap(() => this.loadAllPlaces()),
        catchError(this.handleError)
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

  // Método para manejar errores
  handleError(error: HttpErrorResponse) {
    let errorMessage = '';

    if (error.error instanceof ErrorEvent) {
      // Error del lado del cliente o red
      errorMessage = `Error del cliente o red: ${error.error.message}`;
    } else {
      // El backend retornó un código de error no exitoso
      errorMessage = `Código de error del servidor: ${error.status}\nMensaje: ${error.message}`;
    }

    console.error(errorMessage); // Para depuración

    // Aquí podrías devolver un mensaje amigable para el usuario, o simplemente retornar el error
    return throwError(
      () =>
        new Error(
          'Hubo un problema con la solicitud, inténtelo de nuevo más tarde.'
        )
    );
  }
}
