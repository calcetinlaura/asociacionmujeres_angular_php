import { CommonModule } from '@angular/common';
import {
  Component,
  DestroyRef,
  ElementRef,
  inject,
  OnInit,
  ViewChild,
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
import { ButtonComponent } from 'src/app/shared/components/buttons/button/button.component';
import { IconActionComponent } from 'src/app/shared/components/buttons/icon-action/icon-action.component';
import { InputSearchComponent } from 'src/app/shared/components/inputs/input-search/input-search.component';
import { ModalComponent } from 'src/app/shared/components/modal/modal.component';
import { ModalService } from 'src/app/shared/components/modal/services/modal.service';
import { SpinnerLoadingComponent } from 'src/app/shared/components/spinner-loading/spinner-loading.component';
import { GeneralService } from 'src/app/shared/services/generalService.service';
import { PdfPrintService } from 'src/app/shared/services/PdfPrintService.service';
import { StickyZoneComponent } from '../../components/sticky-zone/sticky-zone.component';

@Component({
  selector: 'app-podcasts-page',
  standalone: true,
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
    StickyZoneComponent,
  ],
  templateUrl: './podcasts-page.component.html',
})
export class PodcastsPageComponent implements OnInit {
  private readonly destroyRef = inject(DestroyRef);
  private readonly modalService = inject(ModalService);
  readonly podcastsFacade = inject(PodcastsFacade);
  private readonly podcastsService = inject(PodcastsService);
  private readonly generalService = inject(GeneralService);
  private readonly pdfPrintService = inject(PdfPrintService);

  columnVisibility: Record<string, boolean> = {};
  displayedColumns: string[] = [];

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

  isModalVisible = false;
  number = 0;

  item: PodcastModel | null = null;
  currentModalAction: TypeActionModal = TypeActionModal.Create;
  searchForm!: FormGroup;
  typeModal = TypeList.Podcasts;
  typeSection = TypeList.Podcasts;

  @ViewChild('printArea', { static: false })
  printArea!: ElementRef<HTMLElement>;

  ngOnInit(): void {
    // Columnas visibles iniciales
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
    this.typeModal = typeModal;
    this.podcastsFacade.clearSelectedPodcast();
    this.modalService.openModal();
  }

  onCloseModal(): void {
    this.modalService.closeModal();
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

  async printTableAsPdf(): Promise<void> {
    if (!this.printArea) return;

    await this.pdfPrintService.printElementAsPdf(this.printArea, {
      filename: 'facturas.pdf',
      preset: 'compact', // 'compact' reduce paddings en celdas
      orientation: 'landscape', // o 'landscape' si la tabla es muy ancha
      format: 'a4',
      margins: [5, 5, 5, 5], // mm
    });
  }

  getVisibleColumns() {
    return this.headerListPodcasts.filter(
      (col) => this.columnVisibility[col.key]
    );
  }
  // Método para actualizar las columnas visibles cuando se hace toggle
  toggleColumn(key: string): void {
    this.columnVisibility[key] = !this.columnVisibility[key];
    this.displayedColumns = this.generalService.updateDisplayedColumns(
      this.headerListPodcasts,
      this.columnVisibility
    );
  }
}
