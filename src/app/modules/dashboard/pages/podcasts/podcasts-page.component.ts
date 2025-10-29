import { CommonModule } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  ElementRef,
  OnInit,
  ViewChild,
  computed,
  inject,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatMenuModule } from '@angular/material/menu';
import { map } from 'rxjs';

import { PodcastsFacade } from 'src/app/application/podcasts.facade';
import {
  ColumnModel,
  ColumnWidth,
} from 'src/app/core/interfaces/column.interface';
import { PodcastModel } from 'src/app/core/interfaces/podcast.interface';
import { TypeActionModal, TypeList } from 'src/app/core/models/general.model';
import { PdfPrintService } from 'src/app/core/services/PdfPrintService.service';
import { PodcastsService } from 'src/app/core/services/podcasts.services';

import { DashboardHeaderComponent } from 'src/app/shared/components/dashboard-header/dashboard-header.component';
import { ModalShellComponent } from 'src/app/shared/components/modal/modal-shell.component';
import { PageToolbarComponent } from 'src/app/shared/components/page-toolbar/page-toolbar.component';
import { SpinnerLoadingComponent } from 'src/app/shared/components/spinner-loading/spinner-loading.component';
import { StickyZoneComponent } from 'src/app/shared/components/sticky-zone/sticky-zone.component';
import { TableComponent } from 'src/app/shared/components/table/table.component';

import { FiltersFacade } from 'src/app/application/filters.facade';
import { ModalFacade } from 'src/app/application/modal.facade';
import { useColumnVisibility } from 'src/app/shared/hooks/use-column-visibility';
import { useEntityList } from 'src/app/shared/hooks/use-entity-list';

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
  // ──────────────────────────────────────────────────────────────────────────────
  // Inyecciones
  // ──────────────────────────────────────────────────────────────────────────────
  private readonly destroyRef = inject(DestroyRef);
  private readonly modalFacade = inject(ModalFacade);
  private readonly podcastsService = inject(PodcastsService);
  private readonly pdfPrintService = inject(PdfPrintService);
  readonly podcastsFacade = inject(PodcastsFacade);
  readonly filtersFacade = inject(FiltersFacade);

  // ──────────────────────────────────────────────────────────────────────────────
  // Columnas
  // ──────────────────────────────────────────────────────────────────────────────
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
      title: 'Equipo artístico',
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

  // ──────────────────────────────────────────────────────────────────────────────
  // Hooks reutilizables
  // ──────────────────────────────────────────────────────────────────────────────
  readonly col = useColumnVisibility('podcasts-table', this.headerListPodcasts);

  readonly list = useEntityList<PodcastModel>({
    filtered$: this.podcastsFacade.filteredPodcasts$.pipe(map((v) => v ?? [])),
    sort: (arr) => this.podcastsService.sortPodcastsById(arr),
    count: (arr) => this.podcastsService.countPodcasts(arr),
  });

  readonly TypeList = TypeList;
  readonly hasRowsSig = computed(() => this.list.countSig() > 0);

  // ──────────────────────────────────────────────────────────────────────────────
  // Modal (ModalFacade)
  // ──────────────────────────────────────────────────────────────────────────────
  readonly modalVisibleSig = this.modalFacade.isVisibleSig;
  readonly currentModalTypeSig = this.modalFacade.typeSig;
  readonly currentModalActionSig = this.modalFacade.actionSig;
  readonly currentItemSig = this.modalFacade.itemSig;

  // Ref impresión
  @ViewChild('printArea', { static: false })
  printArea!: ElementRef<HTMLElement>;

  // ──────────────────────────────────────────────────────────────────────────────
  // Lifecycle
  // ──────────────────────────────────────────────────────────────────────────────
  ngOnInit(): void {
    this.podcastsFacade.loadAllPodcasts();
  }

  // ──────────────────────────────────────────────────────────────────────────────
  // Filtros / búsqueda
  // ──────────────────────────────────────────────────────────────────────────────
  applyFilterWord(keyword: string): void {
    this.filtersFacade.setSearch(keyword);
    this.podcastsFacade.applyFilterWord(keyword);
  }

  // ──────────────────────────────────────────────────────────────────────────────
  // Modal + CRUD
  // ──────────────────────────────────────────────────────────────────────────────
  addNewPodcastModal(): void {
    this.podcastsFacade.clearSelectedPodcast();
    this.modalFacade.open(TypeList.Podcasts, TypeActionModal.Create, null);
  }

  onOpenModal(event: {
    typeModal: TypeList;
    action: TypeActionModal;
    item?: PodcastModel;
  }): void {
    const { typeModal, action, item } = event;
    if (
      typeModal === TypeList.Podcasts &&
      action !== TypeActionModal.Create &&
      item?.id
    ) {
      this.podcastsService
        .getPodcastById(item.id)
        .pipe(takeUntilDestroyed(this.destroyRef))
        .subscribe({
          next: (fresh) =>
            this.modalFacade.open(typeModal, action, fresh ?? item ?? null),
          error: () => this.modalFacade.open(typeModal, action, item ?? null),
        });
      return;
    }

    this.modalFacade.open(typeModal, action, item ?? null);
  }

  onCloseModal(): void {
    this.modalFacade.close();
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
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(() => this.modalFacade.close());
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
