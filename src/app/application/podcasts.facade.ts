import { inject, Injectable } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { BehaviorSubject, catchError, Observable, tap } from 'rxjs';
import { PodcastModel } from 'src/app/core/interfaces/podcast.interface';
import { PodcastsService } from 'src/app/core/services/podcasts.services';
import { includesNormalized, toSearchKey } from '../shared/utils/text.utils';
import { LoadableFacade } from './loadable.facade';

@Injectable({ providedIn: 'root' })
export class PodcastsFacade extends LoadableFacade {
  private readonly podcastsService = inject(PodcastsService);

  // State propio
  private readonly podcastsSubject = new BehaviorSubject<PodcastModel[] | null>(
    null
  );
  private readonly filteredPodcastsSubject = new BehaviorSubject<
    PodcastModel[] | null
  >(null);
  private readonly selectedPodcastSubject =
    new BehaviorSubject<PodcastModel | null>(null);

  // Streams públicos
  readonly podcasts$ = this.podcastsSubject.asObservable();
  readonly filteredPodcasts$ = this.filteredPodcastsSubject.asObservable();
  readonly selectedPodcast$ = this.selectedPodcastSubject.asObservable();

  // ---------- API pública

  loadAllPodcasts(): void {
    this.executeWithLoading(this.podcastsService.getPodcasts(), (podcasts) =>
      this.updatePodcastState(podcasts)
    );
  }

  loadPodcastById(id: number): void {
    this.executeWithLoading(
      this.podcastsService.getPodcastById(id),
      (podcast) => this.selectedPodcastSubject.next(podcast)
    );
  }

  addPodcast(podcast: FormData): Observable<FormData> {
    return this.wrapWithLoading(this.podcastsService.add(podcast)).pipe(
      takeUntilDestroyed(this.destroyRef),
      tap(() => this.loadAllPodcasts()),
      catchError((err) => this.generalService.handleHttpError(err))
    );
  }

  editPodcast(podcast: FormData): Observable<FormData> {
    return this.wrapWithLoading(this.podcastsService.edit(podcast)).pipe(
      takeUntilDestroyed(this.destroyRef),
      tap(() => this.loadAllPodcasts()),
      catchError((err) => this.generalService.handleHttpError(err))
    );
  }

  deletePodcast(id: number): void {
    this.executeWithLoading(this.podcastsService.delete(id), () =>
      this.loadAllPodcasts()
    );
  }

  clearSelectedPodcast(): void {
    this.selectedPodcastSubject.next(null);
  }

  applyFilterWord(keyword: string): void {
    const all = this.podcastsSubject.getValue();

    if (!all) {
      this.filteredPodcastsSubject.next(all);
      return;
    }

    if (!toSearchKey(keyword)) {
      this.filteredPodcastsSubject.next(all);
      return;
    }

    const filtered = all.filter((p) =>
      [p.title, p.artists].some((field) => includesNormalized(field, keyword))
    );

    this.filteredPodcastsSubject.next(filtered);
  }

  // ---------- Privado / utilidades

  private updatePodcastState(podcasts: PodcastModel[]): void {
    this.podcastsSubject.next(podcasts);
    this.filteredPodcastsSubject.next(podcasts);
  }
}
