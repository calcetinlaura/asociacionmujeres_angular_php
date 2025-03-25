import { DestroyRef, inject, Injectable } from '@angular/core';
import { BehaviorSubject, catchError, Observable, tap, throwError } from 'rxjs';
import { PlacesService } from '../core/services/places.services';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { PlaceModel } from '../core/interfaces/place.interface';
import { HttpErrorResponse } from '@angular/common/http';

@Injectable({
  providedIn: 'root',
})
export class PlacesFacade {
  private destroyRef = inject(DestroyRef);
  private placesService = inject(PlacesService);
  private placesSubject = new BehaviorSubject<PlaceModel[] | null>(null);
  private filteredPlacesSubject = new BehaviorSubject<PlaceModel[] | null>(
    null
  );
  private selectedPlaceSubject = new BehaviorSubject<PlaceModel | null>(null);
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

  applyFilter(keyword: string): void {
    const searchValue = keyword.toLowerCase();
    const allPlaces = this.placesSubject.getValue();

    if (!searchValue) {
      this.filteredPlacesSubject.next(allPlaces);
    } else {
      const filteredPlaces = this.placesSubject
        .getValue()!
        .filter((place) => place.name.toLowerCase().includes(searchValue));

      this.filteredPlacesSubject.next(filteredPlaces);
    }
  }

  updatePlaceState(places: PlaceModel[]): void {
    this.placesSubject.next(places);
    this.filteredPlacesSubject.next(places); // Actualiza también los libros filtrados
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
