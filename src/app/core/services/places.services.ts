import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { PlaceModel, SalaModel } from 'src/app/core/interfaces/place.interface';
import { GeneralService } from 'src/app/shared/services/generalService.service';
import { environments } from 'src/environments/environments';

@Injectable({
  providedIn: 'root',
})
export class PlacesService {
  private readonly generalService = inject(GeneralService);
  private apiUrl: string = `${environments.api}/backend/places.php`;
  constructor(private http: HttpClient) {}

  getPlaces(): Observable<any> {
    return this.http
      .get(this.apiUrl)
      .pipe(catchError((err) => this.generalService.handleHttpError(err)));
  }

  getPlacesByManagement(management: string): Observable<any> {
    return this.http
      .get(this.apiUrl, { params: { management: management } })
      .pipe(catchError((err) => this.generalService.handleHttpError(err)));
  }

  getPlacesByType(type: string): Observable<any> {
    return this.http
      .get(this.apiUrl, { params: { type: type } })
      .pipe(catchError((err) => this.generalService.handleHttpError(err)));
  }

  getPlacesByTown(town: string): Observable<any> {
    return this.http
      .get(this.apiUrl, { params: { town: town } })
      .pipe(catchError((err) => this.generalService.handleHttpError(err)));
  }

  getPlaceById(id: number): Observable<any> {
    return this.http
      .get(`${this.apiUrl}/${id}`)
      .pipe(catchError((err) => this.generalService.handleHttpError(err)));
  }

  getAllPlacesWithSalas(): Observable<PlaceModel[]> {
    return this.http
      .get<PlaceModel[]>(`${this.apiUrl}?withSalas=true`)
      .pipe(catchError((err) => this.generalService.handleHttpError(err)));
  }

  getSalasByPlaceId(placeId: number): Observable<SalaModel[]> {
    return this.http.get<SalaModel[]>(
      `${this.apiUrl}/salas?place_id=${placeId}`
    );
  }

  add(place: FormData): Observable<any> {
    return this.http
      .post(this.apiUrl, place)
      .pipe(catchError((err) => this.generalService.handleHttpError(err)));
  }

  edit(id: number, place: FormData): Observable<any> {
    return this.http
      .post(this.apiUrl, place)
      .pipe(catchError((err) => this.generalService.handleHttpError(err)));
  }

  delete(id: number): Observable<any> {
    return this.http
      .delete(this.apiUrl, { params: { id: id } })
      .pipe(catchError((err) => this.generalService.handleHttpError(err)));
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
}
