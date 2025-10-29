import { inject, Injectable } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { BehaviorSubject, EMPTY, Observable } from 'rxjs';
import { catchError, finalize, tap } from 'rxjs/operators';
import { PodcastModel } from 'src/app/core/interfaces/podcast.interface';
import { PodcastsService } from 'src/app/core/services/podcasts.services';
import { includesNormalized, toSearchKey } from '../shared/utils/text.utils';
import { LoadableFacade } from './loadable.facade';

@Injectable({ providedIn: 'root' })
export class PodcastsFacade extends LoadableFacade {
  private readonly podcastsService = inject(PodcastsService);

  // ───────── STATE ─────────
  private readonly podcastsSubject = new BehaviorSubject<PodcastModel[] | null>(
    null
  );
  private readonly filteredPodcastsSubject = new BehaviorSubject<
    PodcastModel[] | null
  >(null);
  private readonly selectedPodcastSubject =
    new BehaviorSubject<PodcastModel | null>(null);

  private readonly listLoadingSubject = new BehaviorSubject<boolean>(false);
  private readonly itemLoadingSubject = new BehaviorSubject<boolean>(false);

  // ───────── PUBLIC STREAMS ─────────
  readonly podcasts$ = this.podcastsSubject.asObservable();
  readonly filteredPodcasts$ = this.filteredPodcastsSubject.asObservable();
  readonly selectedPodcast$ = this.selectedPodcastSubject.asObservable();
  readonly isLoadingList$ = this.listLoadingSubject.asObservable();
  readonly isLoadingItem$ = this.itemLoadingSubject.asObservable();

  // ───────── LISTA → isLoadingList$ ─────────
  loadAllPodcasts(): void {
    this.listLoadingSubject.next(true);

    this.podcastsService
      .getPodcasts()
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        tap((podcasts) => this.updatePodcastState(podcasts)),
        catchError((err) => {
          this.generalService.handleHttpError(err);
          return EMPTY;
        }),
        finalize(() => this.listLoadingSubject.next(false))
      )
      .subscribe();
  }

  // ───────── ITEM → isLoadingItem$ ─────────
  loadPodcastById(id: number): void {
    this.itemLoadingSubject.next(true);

    this.podcastsService
      .getPodcastById(id)
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        tap((podcast) => this.selectedPodcastSubject.next(podcast)),
        catchError((err) => {
          this.generalService.handleHttpError(err);
          return EMPTY;
        }),
        finalize(() => this.itemLoadingSubject.next(false))
      )
      .subscribe();
  }

  // ───────── CRUD ─────────
  addPodcast(podcast: FormData): Observable<FormData> {
    this.itemLoadingSubject.next(true);

    return this.podcastsService.add(podcast).pipe(
      takeUntilDestroyed(this.destroyRef),
      tap(() => this.loadAllPodcasts()),
      catchError((err) => {
        this.generalService.handleHttpError(err);
        return EMPTY;
      }),
      finalize(() => this.itemLoadingSubject.next(false))
    );
  }

  editPodcast(podcast: FormData): Observable<FormData> {
    this.itemLoadingSubject.next(true);

    return this.podcastsService.edit(podcast).pipe(
      takeUntilDestroyed(this.destroyRef),
      tap(() => this.loadAllPodcasts()),
      catchError((err) => {
        this.generalService.handleHttpError(err);
        return EMPTY;
      }),
      finalize(() => this.itemLoadingSubject.next(false))
    );
  }

  deletePodcast(id: number): void {
    this.itemLoadingSubject.next(true);

    this.podcastsService
      .delete(id)
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        tap(() => this.loadAllPodcasts()),
        catchError((err) => {
          this.generalService.handleHttpError(err);
          return EMPTY;
        }),
        finalize(() => this.itemLoadingSubject.next(false))
      )
      .subscribe();
  }

  // ───────── HELPERS ─────────
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

  // ───────── PRIVATE ─────────
  private updatePodcastState(podcasts: PodcastModel[]): void {
    this.podcastsSubject.next(podcasts);
    this.filteredPodcastsSubject.next(podcasts);
  }
}
