import { CommonModule } from '@angular/common';
import { Component, DestroyRef, inject, OnInit } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormGroup, ReactiveFormsModule } from '@angular/forms';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatMenuModule } from '@angular/material/menu';
import { tap } from 'rxjs';
import { PodcastsFacade } from 'src/app/application/podcasts.facade';
import {
  ColumnModel,
  ColumnWidth,
} from 'src/app/core/interfaces/column.interface';
import { PodcastModel } from 'src/app/core/interfaces/podcast.interface';
import { TypeActionModal, TypeList } from 'src/app/core/models/general.model';
import { PodcastsService } from 'src/app/core/services/podcasts.services';
import { DashboardHeaderComponent } from 'src/app/modules/dashboard/components/dashboard-header/dashboard-header.component';
import { TableComponent } from 'src/app/modules/dashboard/components/table/table.component';
import { ButtonIconComponent } from 'src/app/shared/components/buttons/button-icon/button-icon.component';
import { ButtonComponent } from 'src/app/shared/components/buttons/button/button.component';
import { IconActionComponent } from 'src/app/shared/components/buttons/icon-action/icon-action.component';
import { InputSearchComponent } from 'src/app/shared/components/inputs/input-search/input-search.component';
import { ModalComponent } from 'src/app/shared/components/modal/modal.component';
import { ModalService } from 'src/app/shared/components/modal/services/modal.service';
import { SpinnerLoadingComponent } from 'src/app/shared/components/spinner-loading/spinner-loading.component';
import { GeneralService } from 'src/app/shared/services/generalService.service';
import { PdfPrintService } from 'src/app/shared/services/PdfPrintService.service';

@Component({
  selector: 'app-podcasts-page',
  imports: [
    DashboardHeaderComponent,
    ModalComponent,
    ButtonIconComponent,
    ReactiveFormsModule,
    InputSearchComponent,
    SpinnerLoadingComponent,
    TableComponent,
    MatMenuModule,
    MatCheckboxModule,
    ButtonComponent,
    IconActionComponent,
    CommonModule,
  ],
  templateUrl: './podcasts-page.component.html',
  styleUrl: './podcasts-page.component.css',
})
export class PodcastsPageComponent implements OnInit {
  private readonly destroyRef = inject(DestroyRef);
  private readonly modalService = inject(ModalService);
  private readonly podcastsFacade = inject(PodcastsFacade);
  private readonly podcastsService = inject(PodcastsService);
  private readonly pdfPrintService = inject(PdfPrintService);
  private readonly generalService = inject(GeneralService);

  podcasts: PodcastModel[] = [];
  filteredPodcasts: PodcastModel[] = [];

  isLoading = true;
  isModalVisible = false;
  number = 0;

  item: PodcastModel | null = null;
  currentModalAction: TypeActionModal = TypeActionModal.Create;
  searchForm!: FormGroup;
  typeSection = TypeList.Podcasts;
  typeModal = TypeList.Podcasts;
  columnVisibility: Record<string, boolean> = {};
  displayedColumns: string[] = [];

  headerListPodcasts: ColumnModel[] = [
    { title: 'Portada', key: 'img', sortable: false },
    { title: 'Título', key: 'title', sortable: true },
    { title: 'Fecha', key: 'date', sortable: true },
    {
      title: 'Descripción',
      key: 'description',
      sortable: true,
      booleanIndicator: true,
      width: ColumnWidth.SM,
    },
  ];

  ngOnInit(): void {
    // Ocultar 'date_payment' y 'date_accounting' al cargar la página
    this.columnVisibility = this.generalService.setColumnVisibility(
      this.headerListPodcasts,
      [''] // Coloca las columnas que deseas ocultar aquí
    );

    // Actualiza las columnas visibles según el estado de visibilidad
    this.displayedColumns = this.generalService.updateDisplayedColumns(
      this.headerListPodcasts,
      this.columnVisibility
    );
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
    this.openModal(this.typeModal, TypeActionModal.Create, null);
  }

  onOpenModal(event: {
    typeModal: TypeList;
    action: TypeActionModal;
    item?: PodcastModel;
  }): void {
    this.openModal(event.typeModal, event.action, event.item ?? null);
  }

  openModal(
    typeModal: TypeList,
    action: TypeActionModal,
    podcast: PodcastModel | null
  ): void {
    this.currentModalAction = action;
    this.item = podcast;
    this.typeModal = TypeList.Podcasts;
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
  printTableAsPdf(): void {
    this.pdfPrintService.printTableAsPdf('table-to-print', 'podcasts.pdf');
  }
  getVisibleColumns() {
    return this.headerListPodcasts.filter(
      (col) => this.columnVisibility[col.key]
    );
  }
  // Método para actualizar las columnas visibles cuando se hace toggle
  toggleColumn(key: string): void {
    // Cambia la visibilidad de la columna en columnVisibility
    this.columnVisibility[key] = !this.columnVisibility[key];
    // Actualiza las columnas visibles en la tabla después de cambiar el estado
    this.displayedColumns = this.generalService.updateDisplayedColumns(
      this.headerListPodcasts,
      this.columnVisibility
    );
  }

  private updateDisplayedColumns(): void {
    const base = ['number']; // si usas un número de fila
    const dynamic = this.headerListPodcasts
      .filter((col) => this.columnVisibility[col.key])
      .map((col) => col.key);
    this.displayedColumns = [...base, ...dynamic, 'actions'];
  }
}
