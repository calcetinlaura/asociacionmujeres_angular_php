import { inject, Injectable } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { BehaviorSubject, catchError, finalize, Observable, tap } from 'rxjs';
import { PodcastModel } from 'src/app/core/interfaces/podcast.interface';
import { PodcastsService } from 'src/app/core/services/podcasts.services';
import { includesNormalized, toSearchKey } from '../shared/utils/text.utils';
import { LoadableFacade } from './loadable.facade';

@Injectable({ providedIn: 'root' })
export class PodcastsFacade extends LoadableFacade {
  private readonly podcastsService = inject(PodcastsService);

  // Estado
  private readonly podcastsSubject = new BehaviorSubject<PodcastModel[] | null>(
    null
  );
  private readonly filteredPodcastsSubject = new BehaviorSubject<
    PodcastModel[] | null
  >(null);
  private readonly selectedPodcastSubject =
    new BehaviorSubject<PodcastModel | null>(null);

  // NEW: loaders separados
  private readonly listLoadingSubject = new BehaviorSubject<boolean>(false);
  private readonly itemLoadingSubject = new BehaviorSubject<boolean>(false);

  // Streams públicos
  readonly podcasts$ = this.podcastsSubject.asObservable();
  readonly filteredPodcasts$ = this.filteredPodcastsSubject.asObservable();
  readonly selectedPodcast$ = this.selectedPodcastSubject.asObservable();

  // NEW: usa estos en la UI
  readonly isLoadingList$ = this.listLoadingSubject.asObservable();
  readonly isLoadingItem$ = this.itemLoadingSubject.asObservable();

  // ---------- API pública

  // LISTA → isLoadingList$
  loadAllPodcasts(): void {
    this.listLoadingSubject.next(true);
    this.podcastsService
      .getPodcasts()
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        catchError((err) => this.generalService.handleHttpError(err)),
        finalize(() => this.listLoadingSubject.next(false))
      )
      .subscribe((podcasts) => this.updatePodcastState(podcasts));
  }

  // ITEM → isLoadingItem$
  loadPodcastById(id: number): void {
    this.itemLoadingSubject.next(true);
    this.podcastsService
      .getPodcastById(id)
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        catchError((err) => this.generalService.handleHttpError(err)),
        finalize(() => this.itemLoadingSubject.next(false))
      )
      .subscribe((podcast) => this.selectedPodcastSubject.next(podcast));
  }

  addPodcast(podcast: FormData): Observable<FormData> {
    this.itemLoadingSubject.next(true);
    return this.podcastsService.add(podcast).pipe(
      takeUntilDestroyed(this.destroyRef),
      tap(() => this.loadAllPodcasts()),
      catchError((err) => this.generalService.handleHttpError(err)),
      finalize(() => this.itemLoadingSubject.next(false))
    );
  }

  editPodcast(podcast: FormData): Observable<FormData> {
    this.itemLoadingSubject.next(true);
    return this.podcastsService.edit(podcast).pipe(
      takeUntilDestroyed(this.destroyRef),
      tap(() => this.loadAllPodcasts()),
      catchError((err) => this.generalService.handleHttpError(err)),
      finalize(() => this.itemLoadingSubject.next(false))
    );
  }

  deletePodcast(id: number): void {
    this.itemLoadingSubject.next(true);
    this.podcastsService
      .delete(id)
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        catchError((err) => this.generalService.handleHttpError(err)),
        finalize(() => this.itemLoadingSubject.next(false))
      )
      .subscribe(() => this.loadAllPodcasts());
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
