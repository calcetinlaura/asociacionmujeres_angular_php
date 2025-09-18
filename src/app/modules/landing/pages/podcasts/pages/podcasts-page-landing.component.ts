import { CommonModule } from '@angular/common';
import { Component, DestroyRef, inject, OnInit } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { tap } from 'rxjs';
import { PodcastsFacade } from 'src/app/application/podcasts.facade';
import { PodcastModel } from 'src/app/core/interfaces/podcast.interface';
import { TypeList } from 'src/app/core/models/general.model';
import { PodcastsService } from 'src/app/core/services/podcasts.services';
import { NoResultsComponent } from 'src/app/modules/landing/components/no-results/no-results.component';
import { SectionGenericComponent } from 'src/app/modules/landing/components/section-generic/section-generic.component';
import { InputSearchComponent } from 'src/app/shared/components/inputs/input-search/input-search.component';
import { SpinnerLoadingComponent } from 'src/app/shared/components/spinner-loading/spinner-loading.component';

@Component({
  selector: 'app-podcasts-page-landing',
  imports: [
    CommonModule,
    SectionGenericComponent,
    InputSearchComponent,
    NoResultsComponent,
    SpinnerLoadingComponent,
  ],
  templateUrl: './podcasts-page-landing.component.html',
})
export class PodcastsPageLandingComponent implements OnInit {
  private readonly destroyRef = inject(DestroyRef);
  readonly podcastsFacade = inject(PodcastsFacade);
  private readonly podcastsService = inject(PodcastsService);

  podcasts: PodcastModel[] = [];
  filteredPodcasts: PodcastModel[] = [];
  areThereResults = false;
  typeList = TypeList;
  number = 0;
  selectedFilter = '';

  ngOnInit(): void {
    this.loadAllPodcasts();
  }

  loadAllPodcasts(): void {
    this.podcastsFacade.loadAllPodcasts();
    this.podcastsFacade.filteredPodcasts$
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        tap((podcasts) => {
          this.updatePodcastState(podcasts);
        })
      )
      .subscribe();
  }

  applyFilterWord(keyword: string): void {
    this.podcastsFacade.applyFilterWord(keyword);
  }

  updatePodcastState(podcasts: PodcastModel[] | null): void {
    if (!podcasts) return;

    this.podcasts = this.podcastsService.sortPodcastsByTitle(podcasts);
    this.filteredPodcasts = [...this.podcasts];
    this.number = this.podcastsService.countPodcasts(podcasts);
    this.areThereResults = this.podcastsService.hasResults(podcasts);
  }
}
