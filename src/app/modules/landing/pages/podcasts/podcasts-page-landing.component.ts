import { CommonModule } from '@angular/common';
import { Component, OnInit, computed, inject } from '@angular/core';
import { ModalFacade } from 'src/app/application/modal.facade';

import { PodcastsFacade } from 'src/app/application/podcasts.facade';
import { PodcastModel } from 'src/app/core/interfaces/podcast.interface';
import { TypeActionModal, TypeList } from 'src/app/core/models/general.model';

import { InputSearchComponent } from 'src/app/shared/components/inputs/input-search/input-search.component';
import { NoResultsComponent } from 'src/app/shared/components/no-results/no-results.component';
import { SectionGenericComponent } from 'src/app/shared/components/section-generic/section-generic.component';
import { SpinnerLoadingComponent } from 'src/app/shared/components/spinner-loading/spinner-loading.component';

import { FiltersFacade } from 'src/app/application/filters.facade';
import { ModalShellComponent } from 'src/app/shared/components/modal/modal-shell.component';
import { useEntityList } from 'src/app/shared/hooks/use-entity-list';
import { count, sortByTitle } from 'src/app/shared/utils/facade.utils';

@Component({
  selector: 'app-podcasts-page-landing',
  standalone: true,
  imports: [
    CommonModule,
    SectionGenericComponent,
    InputSearchComponent,
    NoResultsComponent,
    SpinnerLoadingComponent,
    ModalShellComponent,
  ],
  templateUrl: './podcasts-page-landing.component.html',
})
export class PodcastsPageLandingComponent implements OnInit {
  readonly podcastsFacade = inject(PodcastsFacade);
  readonly modalFacade = inject(ModalFacade);
  readonly filtersFacade = inject(FiltersFacade);

  readonly TypeList = TypeList;

  // ===== Lista reactiva con useEntityList =====
  readonly list = useEntityList<PodcastModel>({
    filtered$: this.podcastsFacade.filteredPodcasts$,
    map: (arr) => arr,
    sort: (arr) => sortByTitle(arr),
    count: (arr) => count(arr),
  });

  readonly totalSig = this.list.countSig;
  readonly hasResultsSig = computed(() => this.totalSig() > 0);

  // ======================================================
  //  Ciclo de vida
  // ======================================================
  ngOnInit(): void {
    this.loadAllPodcasts();
  }

  loadAllPodcasts(): void {
    this.podcastsFacade.loadAllPodcasts();
  }

  // ======================================================
  // 🔎 Filtro por palabra clave
  // ======================================================
  applyFilterWord(keyword: string): void {
    this.filtersFacade.setSearch(keyword);
    this.podcastsFacade.applyFilterWord(keyword);
  }

  // ======================================================
  //  Acciones con modal
  // ======================================================
  openPodcastDetails(podcast: PodcastModel): void {
    this.modalFacade.open(TypeList.Podcasts, TypeActionModal.Show, podcast);
  }

  closeModal(): void {
    this.modalFacade.close();
  }
}
