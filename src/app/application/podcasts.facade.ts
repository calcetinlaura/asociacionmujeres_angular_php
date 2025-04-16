import { DestroyRef, inject, Injectable } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { BehaviorSubject, catchError, Observable, tap } from 'rxjs';
import { PodcastModel } from '../core/interfaces/podcast.interface';
import { PodcastsService } from '../core/services/podcasts.services';
import { GeneralService } from '../shared/services/generalService.service';

@Injectable({
  providedIn: 'root',
})
export class PodcastsFacade {
  private readonly destroyRef = inject(DestroyRef);
  private readonly podcastsService = inject(PodcastsService);
  private readonly generalService = inject(GeneralService);
  private readonly podcastsSubject = new BehaviorSubject<PodcastModel[] | null>(
    null
  );
  private readonly filteredPodcastsSubject = new BehaviorSubject<
    PodcastModel[] | null
  >(null);
  private readonly selectedPodcastsSubject =
    new BehaviorSubject<PodcastModel | null>(null);

  podcasts$ = this.podcastsSubject.asObservable();
  selectedPodcast$ = this.selectedPodcastsSubject.asObservable();
  filteredPodcasts$ = this.filteredPodcastsSubject.asObservable();

  constructor() {}

  loadAllPodcasts(): void {
    this.podcastsService
      .getPodcasts()
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        tap((podcasts: PodcastModel[]) => this.updatePodcastState(podcasts)),
        catchError((err) => this.generalService.handleHttpError(err))
      )
      .subscribe();
  }

  loadPodcastById(id: number): void {
    this.podcastsService
      .getPodcastById(id)
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        tap((podcast: PodcastModel) =>
          this.selectedPodcastsSubject.next(podcast)
        ),
        catchError((err) => this.generalService.handleHttpError(err))
      )
      .subscribe();
  }

  addPodcast(podcast: FormData): Observable<FormData> {
    return this.podcastsService.add(podcast).pipe(
      takeUntilDestroyed(this.destroyRef),
      tap(() => this.loadAllPodcasts()),
      catchError((err) => this.generalService.handleHttpError(err))
    );
  }

  editPodcast(itemId: number, podcast: FormData): Observable<FormData> {
    return this.podcastsService.edit(itemId, podcast).pipe(
      takeUntilDestroyed(this.destroyRef),
      tap(() => this.loadAllPodcasts()),
      catchError((err) => this.generalService.handleHttpError(err))
    );
  }

  deletePodcast(id: number): void {
    this.podcastsService
      .delete(id)
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        tap(() => this.loadAllPodcasts()),
        catchError((err) => this.generalService.handleHttpError(err))
      )
      .subscribe();
  }

  clearSelectedPodcast(): void {
    this.selectedPodcastsSubject.next(null);
  }

  applyFilterWord(keyword: string): void {
    const allPodcasts = this.podcastsSubject.getValue();

    if (!keyword.trim() || !allPodcasts) {
      this.filteredPodcastsSubject.next(allPodcasts);
      return;
    }
    const search = keyword.trim().toLowerCase();
    const filteredPodcasts = allPodcasts.filter((podcast) =>
      podcast.title.toLowerCase().includes(search)
    );

    this.filteredPodcastsSubject.next(filteredPodcasts);
  }

  updatePodcastState(podcasts: PodcastModel[]): void {
    this.podcastsSubject.next(podcasts);
    this.filteredPodcastsSubject.next(podcasts);
  }
}
