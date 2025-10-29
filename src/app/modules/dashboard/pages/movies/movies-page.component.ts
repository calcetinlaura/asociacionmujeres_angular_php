import { CommonModule } from '@angular/common';
import {
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
import { map, tap } from 'rxjs';

import { FiltersFacade } from 'src/app/application/filters.facade';
import { MoviesFacade } from 'src/app/application/movies.facade';
import {
  ColumnModel,
  ColumnWidth,
} from 'src/app/core/interfaces/column.interface';
import { MovieModel } from 'src/app/core/interfaces/movie.interface';
import { TypeActionModal, TypeList } from 'src/app/core/models/general.model';
import { PdfPrintService } from 'src/app/core/services/PdfPrintService.service';

import { DashboardHeaderComponent } from 'src/app/shared/components/dashboard-header/dashboard-header.component';
import { FiltersComponent } from 'src/app/shared/components/filters/filters.component';
import { ModalShellComponent } from 'src/app/shared/components/modal/modal-shell.component';
import { PageToolbarComponent } from 'src/app/shared/components/page-toolbar/page-toolbar.component';
import { SpinnerLoadingComponent } from 'src/app/shared/components/spinner-loading/spinner-loading.component';
import { StickyZoneComponent } from 'src/app/shared/components/sticky-zone/sticky-zone.component';
import { TableComponent } from 'src/app/shared/components/table/table.component';

import { ModalFacade } from 'src/app/application/modal.facade';
import { useColumnVisibility } from 'src/app/shared/hooks/use-column-visibility';
import { useEntityList } from 'src/app/shared/hooks/use-entity-list';
import { count, sortById } from 'src/app/shared/utils/facade.utils';

@Component({
  selector: 'app-movies-page',
  standalone: true,
  imports: [
    DashboardHeaderComponent,
    SpinnerLoadingComponent,
    StickyZoneComponent,
    TableComponent,
    FiltersComponent,
    ModalShellComponent,
    PageToolbarComponent,
    CommonModule,
    MatMenuModule,
    MatCheckboxModule,
  ],
  templateUrl: './movies-page.component.html',
})
export class MoviesPageComponent implements OnInit {
  private readonly destroyRef = inject(DestroyRef);
  private readonly modalFacade = inject(ModalFacade);
  private readonly pdfPrintService = inject(PdfPrintService);
  readonly moviesFacade = inject(MoviesFacade);
  readonly filtersFacade = inject(FiltersFacade);

  //  Referencia al toolbar (para limpiar buscador)
  @ViewChild(PageToolbarComponent)
  private toolbarComponent!: PageToolbarComponent;

  headerListMovies: ColumnModel[] = [
    { title: 'Portada', key: 'img', sortable: false },
    { title: 'Título', key: 'title', sortable: true, width: ColumnWidth.XL },
    {
      title: 'Director/a',
      key: 'director',
      sortable: true,
      showIndicatorOnEmpty: true,
      width: ColumnWidth.XL,
    },
    {
      title: 'Descripción',
      key: 'description',
      sortable: true,
      innerHTML: true,
      showIndicatorOnEmpty: true,
    },
    {
      title: 'Resumen',
      key: 'summary',
      sortable: true,
      booleanIndicator: true,
      width: ColumnWidth.XS,
    },
    {
      title: 'Género',
      key: 'gender',
      sortable: true,
      backColor: true,
      width: ColumnWidth.SM,
    },
    { title: 'Año compra', key: 'year', sortable: true, width: ColumnWidth.XS },
  ];

  readonly col = useColumnVisibility('movies-table', this.headerListMovies, [
    'year',
    'gender',
  ]);

  // Lista derivada reactiva
  readonly list = useEntityList<MovieModel>({
    filtered$: this.moviesFacade.filteredMovies$.pipe(map((v) => v ?? [])),
    sort: (arr) => sortById(arr),
    count: (arr) => count(arr),
  });
  readonly TypeList = TypeList;
  readonly hasRowsSig = computed(() => this.list.countSig() > 0);

  // ────────────────────────────────────────────────
  // Modal (usando ModalFacade)
  // ────────────────────────────────────────────────
  readonly modalVisibleSig = this.modalFacade.isVisibleSig;
  readonly currentModalTypeSig = this.modalFacade.typeSig;
  readonly currentModalActionSig = this.modalFacade.actionSig;
  readonly currentItemSig = this.modalFacade.itemSig;

  // Ref impresión
  @ViewChild('printArea', { static: false })
  printArea!: ElementRef<HTMLElement>;

  // ────────────────────────────────────────────────
  // Lifecycle
  // ────────────────────────────────────────────────
  ngOnInit(): void {
    //  Cargamos filtros desde la fachada unificada
    this.filtersFacade.loadFiltersFor(TypeList.Movies);
  }
  ngAfterViewInit(): void {
    //  lo llamamos cuando el input ya existe
    setTimeout(() => this.filterSelected(''));
  }

  // ────────────────────────────────────────────────
  // Filtros / búsqueda
  // ────────────────────────────────────────────────
  filterSelected(filter: string): void {
    // Actualiza selección global
    this.filtersFacade.selectFilter(filter);

    //  Limpia el buscador del toolbar
    if (this.toolbarComponent) {
      this.toolbarComponent.clearSearch();
    }

    if (!filter) {
      this.moviesFacade.loadAllMovies();
    } else {
      this.moviesFacade.loadMoviesByFilter(filter);
    }
  }

  applyFilterWord(keyword: string): void {
    this.filtersFacade.setSearch(keyword);
    this.moviesFacade.applyFilterWord(keyword);
  }

  // ────────────────────────────────────────────────
  // Modal + CRUD
  // ────────────────────────────────────────────────
  addNewMovieModal(): void {
    this.moviesFacade.clearSelectedMovie();
    this.modalFacade.open(TypeList.Movies, TypeActionModal.Create, null);
  }

  onOpenModal(event: {
    typeModal: TypeList;
    action: TypeActionModal;
    item?: MovieModel;
  }): void {
    this.modalFacade.open(event.typeModal, event.action, event.item ?? null);
  }

  onCloseModal(): void {
    this.modalFacade.close();
  }

  onDelete({ type, id }: { type: TypeList; id: number }) {
    const actions: Partial<Record<TypeList, (id: number) => void>> = {
      [TypeList.Movies]: (x) => this.moviesFacade.deleteMovie(x),
    };
    actions[type]?.(id);
  }

  sendFormMovie(event: { itemId: number; formData: FormData }): void {
    const save$ = event.itemId
      ? this.moviesFacade.editMovie(event.formData)
      : this.moviesFacade.addMovie(event.formData);

    save$
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        tap(() => this.modalFacade.close())
      )
      .subscribe();
  }

  // Impresión
  async printTableAsPdf(): Promise<void> {
    if (!this.printArea) return;

    await this.pdfPrintService.printElementAsPdf(this.printArea, {
      filename: 'peliculas.pdf',
      preset: 'compact',
      orientation: 'portrait',
      format: 'a4',
      margins: [5, 5, 5, 5],
    });
  }
}
