import { CommonModule } from '@angular/common';
import { Component, OnInit, computed, inject } from '@angular/core';
import { ModalFacade } from 'src/app/application/modal.facade';

import { PodcastsFacade } from 'src/app/application/podcasts.facade';
import { PodcastModel } from 'src/app/core/interfaces/podcast.interface';
import { TypeActionModal, TypeList } from 'src/app/core/models/general.model';
import { PodcastsService } from 'src/app/core/services/podcasts.services';

import { InputSearchComponent } from 'src/app/shared/components/inputs/input-search/input-search.component';
import { NoResultsComponent } from 'src/app/shared/components/no-results/no-results.component';
import { SectionGenericComponent } from 'src/app/shared/components/section-generic/section-generic.component';
import { SpinnerLoadingComponent } from 'src/app/shared/components/spinner-loading/spinner-loading.component';

import { ModalShellComponent } from 'src/app/shared/components/modal/modal-shell.component';
import { useEntityList } from 'src/app/shared/hooks/use-entity-list';

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
  // ===== Inyección de dependencias =====
  private readonly podcastsService = inject(PodcastsService);

  readonly podcastsFacade = inject(PodcastsFacade);
  readonly modalFacade = inject(ModalFacade);

  typeList = TypeList;

  // ===== Lista reactiva con useEntityList =====
  readonly list = useEntityList<PodcastModel>({
    filtered$: this.podcastsFacade.filteredPodcasts$,
    map: (arr) => arr,
    sort: (arr) => this.podcastsService.sortPodcastsByTitle(arr),
    count: (arr) => this.podcastsService.countPodcasts(arr),
  });

  readonly totalSig = this.list.countSig;
  readonly hasResultsSig = computed(() => this.totalSig() > 0);

  // ======================================================
  // 🧭 Ciclo de vida
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
    this.podcastsFacade.applyFilterWord(keyword);
  }

  // ======================================================
  // 🎧 Acciones con modal
  // ======================================================
  openPodcastDetails(podcast: PodcastModel): void {
    this.modalFacade.open(TypeList.Podcasts, TypeActionModal.Show, podcast);
  }

  closeModal(): void {
    this.modalFacade.close();
  }
}
