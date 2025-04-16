import { CommonModule } from '@angular/common';
import { Component, DestroyRef, inject, OnInit } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormGroup, ReactiveFormsModule } from '@angular/forms';
import { tap } from 'rxjs';
import { PodcastsFacade } from 'src/app/application/podcasts.facade';
import { ColumnModel } from 'src/app/core/interfaces/column.interface';
import { PodcastModel } from 'src/app/core/interfaces/podcast.interface';
import { TypeActionModal, TypeList } from 'src/app/core/models/general.model';
import { PodcastsService } from 'src/app/core/services/podcasts.services';
import { DashboardHeaderComponent } from 'src/app/modules/dashboard/components/dashboard-header/dashboard-header.component';
import { TableComponent } from 'src/app/modules/dashboard/components/table/table.component';
import { AddButtonComponent } from 'src/app/shared/components/buttons/button-add/button-add.component';
import { InputSearchComponent } from 'src/app/shared/components/inputs/input-search/input-search.component';
import { ModalComponent } from 'src/app/shared/components/modal/modal.component';
import { ModalService } from 'src/app/shared/components/modal/services/modal.service';
import { SpinnerLoadingComponent } from 'src/app/shared/components/spinner-loading/spinner-loading.component';

@Component({
  selector: 'app-podcasts-page',
  standalone: true,
  imports: [
    CommonModule,
    DashboardHeaderComponent,
    ModalComponent,
    AddButtonComponent,
    ReactiveFormsModule,
    InputSearchComponent,
    SpinnerLoadingComponent,
    TableComponent,
  ],
  templateUrl: './podcasts-page.component.html',
  styleUrl: './podcasts-page.component.css',
})
export class PodcastsPageComponent implements OnInit {
  private readonly destroyRef = inject(DestroyRef);
  private readonly modalService = inject(ModalService);
  private readonly podcastsFacade = inject(PodcastsFacade);
  private readonly podcastsService = inject(PodcastsService);

  podcasts: PodcastModel[] = [];
  filteredPodcasts: PodcastModel[] = [];

  isLoading = true;
  isModalVisible = false;
  number = 0;

  item: PodcastModel | null = null;
  currentModalAction: TypeActionModal = TypeActionModal.Create;
  searchForm!: FormGroup;
  typeList = TypeList.Podcasts;

  headerListPodcasts: ColumnModel[] = [
    { title: 'Portada', key: 'img', sortable: false },
    { title: 'Título', key: 'title', sortable: true },
    { title: 'Fecha', key: 'date', sortable: true },
    { title: 'Descripción', key: 'description', sortable: true },
  ];

  ngOnInit(): void {
    this.modalService.modalVisibility$
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        tap((isVisible) => {
          this.isModalVisible = isVisible;
        })
      )
      .subscribe();

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

  addNewPodcastModal(): void {
    this.openModal(TypeActionModal.Create, null);
  }

  onOpenModal(event: { action: TypeActionModal; item?: PodcastModel }): void {
    this.openModal(event.action, event.item ?? null);
  }

  openModal(action: TypeActionModal, podcast: PodcastModel | null): void {
    this.currentModalAction = action;
    this.item = podcast;
    this.modalService.openModal();
  }

  onCloseModal(): void {
    this.modalService.closeModal();
  }

  confirmDeletePodcast(podcast: PodcastModel | null): void {
    if (!podcast) return;
    this.podcastsFacade.deletePodcast(podcast.id);
    this.onCloseModal();
  }

  sendFormPodcast(event: { itemId: number; formData: FormData }): void {
    const save$ = event.itemId
      ? this.podcastsFacade.editPodcast(event.itemId, event.formData)
      : this.podcastsFacade.addPodcast(event.formData);

    save$
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        tap(() => this.onCloseModal())
      )
      .subscribe();
  }

  private updatePodcastState(podcasts: PodcastModel[] | null): void {
    if (!podcasts) return;

    this.podcasts = this.podcastsService.sortPodcastsById(podcasts);
    this.filteredPodcasts = [...this.podcasts];
    this.number = this.podcastsService.countPodcasts(podcasts);
    this.isLoading = false;
  }
}
