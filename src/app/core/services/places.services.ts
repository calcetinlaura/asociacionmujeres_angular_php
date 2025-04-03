import { Injectable } from '@angular/core';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { catchError } from 'rxjs/operators';
import { Observable, throwError } from 'rxjs';
import { environments } from 'src/environments/environments';
import { PlaceModel } from 'src/app/core/interfaces/place.interface';

@Injectable({
  providedIn: 'root',
})
export class PlacesService {
  private apiUrl: string = `${environments.api}/backend/places.php`;
  constructor(private http: HttpClient) {}

  getPlaces(): Observable<any> {
    return this.http.get(this.apiUrl).pipe(catchError(this.handleError));
  }

  getPlacesByManagement(management: string): Observable<any> {
    return this.http
      .get(this.apiUrl, { params: { management: management } })
      .pipe(catchError(this.handleError));
  }

  getPlacesByType(type: string): Observable<any> {
    return this.http
      .get(this.apiUrl, { params: { type: type } })
      .pipe(catchError(this.handleError));
  }

  getPlacesByTown(town: string): Observable<any> {
    return this.http
      .get(this.apiUrl, { params: { town: town } })
      .pipe(catchError(this.handleError));
  }

  getPlaceById(id: number): Observable<any> {
    return this.http
      .get(`${this.apiUrl}/${id}`)
      .pipe(catchError(this.handleError));
  }

  add(place: FormData): Observable<any> {
    return this.http
      .post(this.apiUrl, place)
      .pipe(catchError(this.handleError));
  }

  edit(id: number, place: FormData): Observable<any> {
    return this.http
      .post(this.apiUrl, place)
      .pipe(catchError(this.handleError));
  }

  delete(id: number): Observable<any> {
    return this.http
      .delete(this.apiUrl, { params: { id: id } })
      .pipe(catchError(this.handleError));
  }

  sortPlacesByTitle(places: PlaceModel[]): PlaceModel[] {
    return places.sort((a, b) =>
      a.name.toLowerCase().localeCompare(b.name.toLowerCase())
    );
  }

  sortPlacesById(places: PlaceModel[]): PlaceModel[] {
    return places.sort((a, b) => b.id - a.id);
  }

  hasResults(places: PlaceModel[] | null): boolean {
    return !!places && places.length > 0;
  }

  countPlaces(places: PlaceModel[] | null): number {
    return places?.length ?? 0;
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
