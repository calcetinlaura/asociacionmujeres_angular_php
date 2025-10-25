import { CommonModule } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  ElementRef,
  inject,
  OnInit,
  ViewChild,
} from '@angular/core';
import { takeUntilDestroyed, toSignal } from '@angular/core/rxjs-interop';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatMenuModule } from '@angular/material/menu';

import { PodcastsFacade } from 'src/app/application/podcasts.facade';
import {
  ColumnModel,
  ColumnWidth,
} from 'src/app/core/interfaces/column.interface';
import { PodcastModel } from 'src/app/core/interfaces/podcast.interface';
import { TypeActionModal, TypeList } from 'src/app/core/models/general.model';
import { PodcastsService } from 'src/app/core/services/podcasts.services';

import { DashboardHeaderComponent } from 'src/app/shared/components/dashboard-header/dashboard-header.component';
import { SpinnerLoadingComponent } from 'src/app/shared/components/spinner-loading/spinner-loading.component';
import { StickyZoneComponent } from 'src/app/shared/components/sticky-zone/sticky-zone.component';
import { TableComponent } from 'src/app/shared/components/table/table.component';
import { PdfPrintService } from 'src/app/shared/services/PdfPrintService.service';

// Reutilizables
import { PageToolbarComponent } from 'src/app/shared/components/page-toolbar/page-toolbar.component';
import { useColumnVisibility } from 'src/app/shared/hooks/use-column-visibility';
import { useEntityList } from 'src/app/shared/hooks/use-entity-list';

// Modal shell + service
import { map } from 'rxjs';
import { ModalShellComponent } from 'src/app/shared/components/modal/modal-shell.component';
import { ModalService } from 'src/app/shared/components/modal/services/modal.service';

@Component({
  selector: 'app-podcasts-page',
  standalone: true,
  imports: [
    // UI
    DashboardHeaderComponent,
    SpinnerLoadingComponent,
    StickyZoneComponent,
    TableComponent,
    ModalShellComponent,
    PageToolbarComponent,
    // Angular
    CommonModule,
    MatMenuModule,
    MatCheckboxModule,
  ],
  templateUrl: './podcasts-page.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PodcastsPageComponent implements OnInit {
  // Servicios
  private readonly destroyRef = inject(DestroyRef);
  private readonly modalService = inject(ModalService);
  private readonly podcastsService = inject(PodcastsService);
  private readonly pdfPrintService = inject(PdfPrintService);

  // Facade pública
  readonly podcastsFacade = inject(PodcastsFacade);

  // Columnas
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
      title: 'Resumen',
      key: 'summary',
      sortable: true,
      booleanIndicator: true,
      width: ColumnWidth.XS,
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

  // Hooks reutilizables
  readonly col = useColumnVisibility('podcasts-table', this.headerListPodcasts);

  readonly list = useEntityList<PodcastModel>({
    filtered$: this.podcastsFacade.filteredPodcasts$.pipe(map((v) => v ?? [])),
    sort: (arr) => this.podcastsService.sortPodcastsById(arr),
    count: (arr) => this.podcastsService.countPodcasts(arr),
  });

  // Modal
  readonly modalVisibleSig = toSignal(this.modalService.modalVisibility$, {
    initialValue: false,
  });
  item: PodcastModel | null = null;
  currentModalAction: TypeActionModal = TypeActionModal.Create;
  typeModal = TypeList.Podcasts;
  typeSection = TypeList.Podcasts;

  @ViewChild('printArea', { static: false })
  printArea!: ElementRef<HTMLElement>;

  // ──────────────────────────────────────────────────────────────────────────────
  // Lifecycle
  // ──────────────────────────────────────────────────────────────────────────────
  ngOnInit(): void {
    // Carga inicial
    this.podcastsFacade.loadAllPodcasts();
  }

  // ──────────────────────────────────────────────────────────────────────────────
  // Búsqueda
  // ──────────────────────────────────────────────────────────────────────────────
  applyFilterWord = (keyword: string) =>
    this.podcastsFacade.applyFilterWord(keyword);

  // ──────────────────────────────────────────────────────────────────────────────
  // Modal
  // ──────────────────────────────────────────────────────────────────────────────
  addNewPodcastModal(): void {
    this.openModal(this.typeModal, TypeActionModal.Create, null);
  }

  onOpenModal(event: {
    typeModal: TypeList;
    action: TypeActionModal;
    item?: PodcastModel;
  }): void {
    if (
      event.typeModal === TypeList.Podcasts &&
      event.action !== TypeActionModal.Create &&
      event.item?.id
    ) {
      this.podcastsService
        .getPodcastById(event.item.id)
        .pipe(takeUntilDestroyed(this.destroyRef))
        .subscribe({
          next: (fresh) => this.openModal(event.typeModal, event.action, fresh),
          error: () =>
            this.openModal(event.typeModal, event.action, event.item ?? null),
        });
      return;
    }
    this.openModal(event.typeModal, event.action, event.item ?? null);
  }

  openModal(
    typeModal: TypeList,
    action: TypeActionModal,
    podcast: PodcastModel | null
  ): void {
    this.currentModalAction = action;
    this.item = podcast
      ? structuredClone?.(podcast) ?? JSON.parse(JSON.stringify(podcast))
      : null;
    this.typeModal = typeModal;

    if (typeModal === TypeList.Podcasts && action === TypeActionModal.Create) {
      this.podcastsFacade.clearSelectedPodcast();
    }

    this.modalService.openModal();
  }

  onCloseModal(): void {
    this.modalService.closeModal();
    this.item = null;
  }

  // ──────────────────────────────────────────────────────────────────────────────
  // CRUD
  // ──────────────────────────────────────────────────────────────────────────────
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

    save$.pipe(takeUntilDestroyed(this.destroyRef)).subscribe(() => {
      this.onCloseModal();
    });
  }

  // ──────────────────────────────────────────────────────────────────────────────
  // Impresión
  // ──────────────────────────────────────────────────────────────────────────────
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
