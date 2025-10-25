import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { GeneralService } from 'src/app/core/services/generalService.service';
import { environments } from 'src/environments/environments';
import { PodcastModel } from '../interfaces/podcast.interface';

@Injectable({
  providedIn: 'root',
})
export class PodcastsService {
  private readonly generalService = inject(GeneralService);
  private apiUrl: string = `${environments.api}/backend/podcasts.php`;
  constructor(private http: HttpClient) {}

  getPodcasts(): Observable<any> {
    return this.http
      .get(this.apiUrl)
      .pipe(catchError((err) => this.generalService.handleHttpError(err)));
  }

  getPodcastById(id: number): Observable<any> {
    return this.http
      .get(`${this.apiUrl}/${id}`)
      .pipe(catchError((err) => this.generalService.handleHttpError(err)));
  }

  add(podcast: FormData): Observable<any> {
    return this.http
      .post(this.apiUrl, podcast)
      .pipe(catchError((err) => this.generalService.handleHttpError(err)));
  }

  edit(podcast: FormData): Observable<any> {
    return this.http
      .post(this.apiUrl, podcast)
      .pipe(catchError((err) => this.generalService.handleHttpError(err)));
  }

  delete(id: number): Observable<any> {
    return this.generalService.deleteOverride<any>(this.apiUrl, { id });
  }

  sortPodcastsById(podcasts: PodcastModel[]): PodcastModel[] {
    return podcasts.sort((a, b) => b.id - a.id);
  }

  sortPodcastsByTitle(podcasts: PodcastModel[]): PodcastModel[] {
    return podcasts.sort((a, b) =>
      a.title.toLowerCase().localeCompare(b.title.toLowerCase())
    );
  }
  hasResults(podcasts: PodcastModel[] | null): boolean {
    return !!podcasts && podcasts.length > 0;
  }

  countPodcasts(podcasts: PodcastModel[] | null): number {
    return podcasts?.length ?? 0;
  }
}
