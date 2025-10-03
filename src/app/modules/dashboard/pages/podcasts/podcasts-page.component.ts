import { CommonModule } from '@angular/common';
import {
  Component,
  DestroyRef,
  ElementRef,
  OnInit,
  Signal,
  ViewChild,
  WritableSignal,
  computed,
  inject,
} from '@angular/core';
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
import { IconActionComponent } from 'src/app/shared/components/buttons/icon-action/icon-action.component';
import { InputSearchComponent } from 'src/app/shared/components/inputs/input-search/input-search.component';
import { SpinnerLoadingComponent } from 'src/app/shared/components/spinner-loading/spinner-loading.component';
import { GeneralService } from 'src/app/shared/services/generalService.service';
import { PdfPrintService } from 'src/app/shared/services/PdfPrintService.service';

import { StickyZoneComponent } from '../../components/sticky-zone/sticky-zone.component';
import { ColumnMenuComponent } from '../../components/table/column-menu.component';

// Nuevo: shell de modal reutilizable
import { ModalShellComponent } from 'src/app/shared/components/modal/modal-shell.component';
// Store de visibilidad de columnas con signals
import { ModalService } from 'src/app/shared/components/modal/services/modal.service';
import { ColumnVisibilityStore } from '../../components/table/column-visibility.store';

@Component({
  selector: 'app-podcasts-page',
  standalone: true,
  imports: [
    // UI
    DashboardHeaderComponent,
    SpinnerLoadingComponent,
    StickyZoneComponent,
    TableComponent,
    ButtonIconComponent,
    IconActionComponent,
    InputSearchComponent,
    ColumnMenuComponent,
    ModalShellComponent,
    // Angular
    CommonModule,
    ReactiveFormsModule,
    MatMenuModule,
    MatCheckboxModule,
  ],
  templateUrl: './podcasts-page.component.html',
})
export class PodcastsPageComponent implements OnInit {
  private readonly destroyRef = inject(DestroyRef);
  private readonly modalService = inject(ModalService);
  private readonly podcastsService = inject(PodcastsService);
  private readonly generalService = inject(GeneralService);
  private readonly pdfPrintService = inject(PdfPrintService);
  private readonly colStore = inject(ColumnVisibilityStore);

  // Facade pública para async pipe
  readonly podcastsFacade = inject(PodcastsFacade);

  headerListPodcasts: ColumnModel[] = [
    { title: 'Portada', key: 'img', sortable: false },
    { title: 'Título', key: 'title', sortable: true, width: ColumnWidth.XL },
    {
      title: 'Episodio',
      key: 'season',
      sortable: false,
      width: ColumnWidth.XS,
    },
    {
      title: 'Duración',
      key: 'duration',
      sortable: true,
      pipe: 'time : hh mm',
      width: ColumnWidth.SM,
    },
    {
      title: 'Fecha',
      key: 'date',
      sortable: true,
      pipe: 'date : dd MMM yyyy',
      width: ColumnWidth.SM,
      textAlign: 'center',
    },
    {
      title: 'Descripción',
      key: 'description',
      sortable: true,
      innerHTML: true,
      showIndicatorOnEmpty: true,
      width: ColumnWidth.LG,
    },
    {
      title: 'Equipo artistico',
      key: 'artists',
      sortable: true,
      innerHTML: true,
      showIndicatorOnEmpty: true,
    },
    {
      title: 'Equipo técnico',
      key: 'technics',
      sortable: true,
      innerHTML: true,
    },
    {
      title: 'Podcast',
      key: 'podcast',
      sortable: true,
      showIndicatorOnEmpty: true,
    },
  ];

  podcasts: PodcastModel[] = [];
  filteredPodcasts: PodcastModel[] = [];
  number = 0;

  // Modal
  isModalVisible = false;
  item: PodcastModel | null = null;
  currentModalAction: TypeActionModal = TypeActionModal.Create;
  typeModal = TypeList.Podcasts;
  typeSection = TypeList.Podcasts;

  // Form
  searchForm!: FormGroup;

  // Signals para columnas
  columnVisSig!: WritableSignal<Record<string, boolean>>;
  displayedColumnsSig!: Signal<string[]>;

  @ViewChild('printArea', { static: false })
  printArea!: ElementRef<HTMLElement>;

  ngOnInit(): void {
    // Visibilidad de columnas persistente
    this.columnVisSig = this.colStore.init(
      'podcasts-table', // clave única
      this.headerListPodcasts,
      [] // columnas ocultas por defecto (ninguna)
    );

    this.displayedColumnsSig = computed(() =>
      this.colStore.displayedColumns(
        this.headerListPodcasts,
        this.columnVisSig()
      )
    );

    // Control de modal
    this.modalService.modalVisibility$
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        tap((isVisible) => (this.isModalVisible = isVisible))
      )
      .subscribe();

    // Carga
    this.podcastsFacade.loadAllPodcasts();

    // Estado desde facade
    this.podcastsFacade.filteredPodcasts$
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        tap((podcasts) => this.updatePodcastState(podcasts))
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
    this.typeModal = typeModal;

    // Importante: limpiar solo en CREATE
    if (typeModal === TypeList.Podcasts && action === TypeActionModal.Create) {
      this.podcastsFacade.clearSelectedPodcast();
    }

    this.modalService.openModal();
  }

  onCloseModal(): void {
    this.modalService.closeModal();
    this.item = null;
  }

  onDelete({ type, id }: { type: TypeList; id: number }) {
    const actions: Partial<Record<TypeList, (id: number) => void>> = {
      [TypeList.Podcasts]: (x) => this.podcastsFacade.deletePodcast(x),
    };
    actions[type]?.(id);
  }

  sendFormPodcast(event: { itemId: number; formData: FormData }): void {
    const save$ = event.itemId
      ? this.podcastsFacade.editPodcast(event.formData)
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
  }

  getVisibleColumns() {
    return this.colStore.visibleColumnModels(
      this.headerListPodcasts,
      this.columnVisSig()
    );
  }

  toggleColumn(key: string): void {
    this.colStore.toggle('podcasts-table', this.columnVisSig, key);
  }

  async printTableAsPdf(): Promise<void> {
    if (!this.printArea) return;

    await this.pdfPrintService.printElementAsPdf(this.printArea, {
      filename: 'podcasts.pdf',
      preset: 'compact',
      orientation: 'landscape',
      format: 'a4',
      margins: [5, 5, 5, 5],
    });
  }
}
