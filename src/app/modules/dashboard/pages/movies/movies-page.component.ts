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

import { MoviesFacade } from 'src/app/application/movies.facade';
import {
  ColumnModel,
  ColumnWidth,
} from 'src/app/core/interfaces/column.interface';
import {
  MovieModel,
  genderFilterMovies,
} from 'src/app/core/interfaces/movie.interface';
import {
  Filter,
  TypeActionModal,
  TypeList,
} from 'src/app/core/models/general.model';
import { MoviesService } from 'src/app/core/services/movies.services';

import { DashboardHeaderComponent } from 'src/app/modules/dashboard/components/dashboard-header/dashboard-header.component';
import { TableComponent } from 'src/app/modules/dashboard/components/table/table.component';
import { FiltersComponent } from 'src/app/modules/landing/components/filters/filters.component';

import { ButtonIconComponent } from 'src/app/shared/components/buttons/button-icon/button-icon.component';
import { IconActionComponent } from 'src/app/shared/components/buttons/icon-action/icon-action.component';
import { InputSearchComponent } from 'src/app/shared/components/inputs/input-search/input-search.component';
import { SpinnerLoadingComponent } from 'src/app/shared/components/spinner-loading/spinner-loading.component';
import { GeneralService } from 'src/app/shared/services/generalService.service';
import { PdfPrintService } from 'src/app/shared/services/PdfPrintService.service';

import { StickyZoneComponent } from '../../components/sticky-zone/sticky-zone.component';
import { ColumnMenuComponent } from '../../components/table/column-menu.component';

// 👇 Importa el shell en lugar de usar <app-modal> directo
import { ModalShellComponent } from 'src/app/shared/components/modal/modal-shell.component';
import { ModalService } from 'src/app/shared/components/modal/services/modal.service';
import { ColumnVisibilityStore } from '../../components/table/column-visibility.store';

@Component({
  selector: 'app-movies-page',
  standalone: true,
  imports: [
    // UI
    DashboardHeaderComponent,
    SpinnerLoadingComponent,
    StickyZoneComponent,
    TableComponent,
    FiltersComponent,
    ButtonIconComponent,
    IconActionComponent,
    InputSearchComponent,
    ColumnMenuComponent,
    ModalShellComponent, // 👈 aquí
    // Angular
    CommonModule,
    ReactiveFormsModule,
    MatMenuModule,
    MatCheckboxModule,
  ],
  templateUrl: './movies-page.component.html',
})
export class MoviesPageComponent implements OnInit {
  // Servicios
  private readonly destroyRef = inject(DestroyRef);
  private readonly modalService = inject(ModalService);
  private readonly moviesService = inject(MoviesService);
  private readonly generalService = inject(GeneralService);
  private readonly pdfPrintService = inject(PdfPrintService);
  private readonly colStore = inject(ColumnVisibilityStore);

  // Facade (pública para template con async pipe)
  readonly moviesFacade = inject(MoviesFacade);

  // Tabla
  headerListMovies: ColumnModel[] = [
    { title: 'Portada', key: 'img', sortable: false },
    { title: 'Título', key: 'title', sortable: true },
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
      title: 'Género',
      key: 'gender',
      sortable: true,
      backColor: true,
      width: ColumnWidth.SM,
    },
    { title: 'Año compra', key: 'year', sortable: true, width: ColumnWidth.XS },
  ];

  // Datos
  movies: MovieModel[] = [];
  filteredMovies: MovieModel[] = [];
  number = 0;

  // Filtros
  filters: Filter[] = [];
  selectedFilter = '';

  // Modal
  isModalVisible = false;
  item: MovieModel | null = null;
  currentModalAction: TypeActionModal = TypeActionModal.Create;
  typeModal: TypeList = TypeList.Movies;
  typeSection: TypeList = TypeList.Movies;

  // Form
  searchForm!: FormGroup;

  // signals
  columnVisSig!: WritableSignal<Record<string, boolean>>;
  displayedColumnsSig!: Signal<string[]>;

  // Refs
  @ViewChild(InputSearchComponent)
  private inputSearchComponent!: InputSearchComponent;

  @ViewChild('printArea', { static: false })
  printArea!: ElementRef<HTMLElement>;

  // ──────────────────────────────────────────────────────────────────────────────
  // Lifecycle
  // ──────────────────────────────────────────────────────────────────────────────
  ngOnInit(): void {
    // 1) inicializa la visibilidad con una clave única por tabla/página
    this.columnVisSig = this.colStore.init(
      'movies-table', // <- clave única (cambia por 'macroevents-table', etc.)
      this.headerListMovies,
      ['year'] // <- columnas ocultas por defecto
    );

    // 2) señal derivada para las columnas mostradas (keys)
    this.displayedColumnsSig = computed(() =>
      this.colStore.displayedColumns(this.headerListMovies, this.columnVisSig())
    );

    // Filtros
    this.filters = [{ code: '', name: 'Todos' }, ...genderFilterMovies];

    // Modal visibilidad
    this.modalService.modalVisibility$
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        tap((isVisible) => (this.isModalVisible = isVisible))
      )
      .subscribe();

    // Carga inicial
    this.filterSelected('');

    // Estado desde facade
    this.moviesFacade.filteredMovies$
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        tap((movies) => this.updateMovieState(movies))
      )
      .subscribe();
  }

  // ──────────────────────────────────────────────────────────────────────────────
  // Filtros / búsqueda
  // ──────────────────────────────────────────────────────────────────────────────
  filterSelected(filter: string): void {
    this.selectedFilter = filter;
    this.generalService.clearSearchInput(this.inputSearchComponent);

    if (!filter) {
      this.moviesFacade.loadAllMovies();
    } else {
      this.moviesFacade.loadMoviesByFilter(filter);
    }
  }

  applyFilterWord(keyword: string): void {
    this.moviesFacade.applyFilterWord(keyword);
  }

  // ──────────────────────────────────────────────────────────────────────────────
  // Modal
  // ──────────────────────────────────────────────────────────────────────────────
  addNewMovieModal(): void {
    this.openModal(TypeList.Movies, TypeActionModal.Create, null);
  }

  onOpenModal(event: {
    typeModal: TypeList;
    action: TypeActionModal;
    item?: MovieModel;
  }): void {
    this.openModal(event.typeModal, event.action, event.item ?? null);
  }

  openModal(
    typeModal: TypeList,
    action: TypeActionModal,
    movie: MovieModel | null
  ): void {
    this.currentModalAction = action;
    this.item = movie;
    this.typeModal = typeModal;

    // ⚠️ Importante: solo limpiar en CREATE para no abrir vacío en ver/editar
    if (typeModal === TypeList.Movies && action === TypeActionModal.Create) {
      this.moviesFacade.clearSelectedMovie();
    }

    this.modalService.openModal();
  }

  onCloseModal(): void {
    this.modalService.closeModal();
    this.item = null; // limpiar referencia para evitar arrastrar estado
  }

  // ──────────────────────────────────────────────────────────────────────────────
  // CRUD
  // ──────────────────────────────────────────────────────────────────────────────
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
        tap(() => this.onCloseModal())
      )
      .subscribe();
  }

  // ──────────────────────────────────────────────────────────────────────────────
  // Tabla helpers
  // ──────────────────────────────────────────────────────────────────────────────
  private updateMovieState(movies: MovieModel[] | null): void {
    if (!movies) return;

    this.movies = this.moviesService.sortMoviesById(movies);
    this.filteredMovies = [...this.movies];
    this.number = this.moviesService.countMovies(movies);
  }

  getVisibleColumns() {
    return this.colStore.visibleColumnModels(
      this.headerListMovies,
      this.columnVisSig()
    );
  }

  toggleColumn(key: string): void {
    this.colStore.toggle('movies-table', this.columnVisSig, key);
    // ya no necesitas recalcular nada manual: displayedColumnsSig() reacciona sola
  }

  // ──────────────────────────────────────────────────────────────────────────────
  // Impresión
  // ──────────────────────────────────────────────────────────────────────────────
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
