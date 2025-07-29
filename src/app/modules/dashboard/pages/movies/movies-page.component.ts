import { CommonModule } from '@angular/common';
import {
  Component,
  DestroyRef,
  inject,
  OnInit,
  ViewChild,
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
  genderFilterMovies,
  MovieModel,
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
import { ButtonComponent } from 'src/app/shared/components/buttons/button/button.component';
import { IconActionComponent } from 'src/app/shared/components/buttons/icon-action/icon-action.component';
import { InputSearchComponent } from 'src/app/shared/components/inputs/input-search/input-search.component';
import { ModalComponent } from 'src/app/shared/components/modal/modal.component';
import { ModalService } from 'src/app/shared/components/modal/services/modal.service';
import { SpinnerLoadingComponent } from 'src/app/shared/components/spinner-loading/spinner-loading.component';
import { GeneralService } from 'src/app/shared/services/generalService.service';
import { PdfPrintService } from 'src/app/shared/services/PdfPrintService.service';

@Component({
  selector: 'app-movies-page',
  imports: [
    DashboardHeaderComponent,
    ModalComponent,
    ButtonIconComponent,
    ReactiveFormsModule,
    InputSearchComponent,
    FiltersComponent,
    SpinnerLoadingComponent,
    TableComponent,
    IconActionComponent,
    ButtonComponent,
    MatMenuModule,
    MatCheckboxModule,
    CommonModule,
  ],
  templateUrl: './movies-page.component.html',
  styleUrl: './movies-page.component.css',
})
export class MoviesPageComponent implements OnInit {
  private readonly destroyRef = inject(DestroyRef);
  private readonly modalService = inject(ModalService);
  private readonly moviesFacade = inject(MoviesFacade);
  private readonly moviesService = inject(MoviesService);
  private readonly generalService = inject(GeneralService);
  private readonly pdfPrintService = inject(PdfPrintService);
  movies: MovieModel[] = [];
  filteredMovies: MovieModel[] = [];
  filters: Filter[] = [];
  selectedFilter = 'ALL';

  isLoading = true;
  isModalVisible = false;
  number = 0;

  item: MovieModel | null = null;
  currentModalAction: TypeActionModal = TypeActionModal.Create;
  searchForm!: FormGroup;
  typeModal = TypeList.Movies;
  typeSection = TypeList.Movies;
  columnVisibility: Record<string, boolean> = {};
  displayedColumns: string[] = [];
  headerListMovies: ColumnModel[] = [
    { title: 'Portada', key: 'img', sortable: false },
    { title: 'Título', key: 'title', sortable: true },
    {
      title: 'Director/a',
      key: 'director',
      sortable: true,
      showIndicatorOnEmpty: true,
    },
    {
      title: 'Descripción',
      key: 'description',
      sortable: true,
      booleanIndicator: true,
      width: ColumnWidth.SM,
    },
    { title: 'Género', key: 'gender', sortable: true, width: ColumnWidth.XS },
    { title: 'Año compra', key: 'year', sortable: true, width: ColumnWidth.XS },
  ];

  @ViewChild(InputSearchComponent)
  private inputSearchComponent!: InputSearchComponent;

  ngOnInit(): void {
    // Ocultar 'date_payment' y 'date_accounting' al cargar la página
    this.columnVisibility = this.generalService.setColumnVisibility(
      this.headerListMovies,
      ['year'] // Coloca las columnas que deseas ocultar aquí
    );

    // Actualiza las columnas visibles según el estado de visibilidad
    this.displayedColumns = this.generalService.updateDisplayedColumns(
      this.headerListMovies,
      this.columnVisibility
    );
    this.filters = [
      { code: 'NOVEDADES', name: 'Novedades' },
      { code: 'ALL', name: 'Todos' },
      ...genderFilterMovies,
    ];

    this.modalService.modalVisibility$
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        tap((isVisible) => {
          this.isModalVisible = isVisible;
        })
      )
      .subscribe();

    this.filterSelected('NOVEDADES');
  }

  filterSelected(filter: string): void {
    this.selectedFilter = filter;
    this.generalService.clearSearchInput(this.inputSearchComponent);
    this.loadByFilter(filter);
  }

  private loadByFilter(filter: string): void {
    const loaders: Record<string, () => void> = {
      ALL: () => this.moviesFacade.loadAllMovies(),
      NOVEDADES: () => this.moviesFacade.loadMoviesByLatest(),
    };

    (loaders[filter] || (() => this.moviesFacade.loadMoviesByGender(filter)))();

    this.moviesFacade.movies$
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        tap((movies) => this.updateMovieState(movies))
      )
      .subscribe();
  }

  applyFilterWord(keyword: string): void {
    this.moviesFacade.applyFilterWord(keyword);
    this.moviesFacade.filteredMovies$
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        tap((movies) => this.updateMovieState(movies))
      )
      .subscribe();
  }

  addNewMovieModal(): void {
    this.openModal(this.typeModal, TypeActionModal.Create, null);
  }

  onOpenModal(event: {
    typeModal: TypeList;
    action: TypeActionModal;
    item: MovieModel;
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
    this.modalService.openModal();
  }

  onCloseModal(): void {
    this.modalService.closeModal();
  }

  confirmDeleteMovie(movie: MovieModel | null): void {
    if (!movie) return;
    this.moviesFacade.deleteMovie(movie.id);
    this.onCloseModal();
  }

  sendFormMovie(event: { itemId: number; formData: FormData }): void {
    const save$ = event.itemId
      ? this.moviesFacade.editMovie(event.itemId, event.formData)
      : this.moviesFacade.addMovie(event.formData);

    save$
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        tap(() => this.onCloseModal())
      )
      .subscribe();
  }

  private updateMovieState(movies: MovieModel[] | null): void {
    if (!movies) return;

    this.movies = this.moviesService.sortMoviesById(movies);
    this.filteredMovies = [...this.movies];
    this.number = this.moviesService.countMovies(movies);
    this.isLoading = false;
  }
  getVisibleColumns() {
    return this.headerListMovies.filter(
      (col) => this.columnVisibility[col.key]
    );
  }
  // Método para actualizar las columnas visibles cuando se hace toggle
  toggleColumn(key: string): void {
    // Cambia la visibilidad de la columna en columnVisibility
    this.columnVisibility[key] = !this.columnVisibility[key];
    // Actualiza las columnas visibles en la tabla después de cambiar el estado
    this.displayedColumns = this.generalService.updateDisplayedColumns(
      this.headerListMovies,
      this.columnVisibility
    );
  }
  printTableAsPdf(): void {
    this.pdfPrintService.printTableAsPdf('table-to-print', 'peliculas.pdf');
  }
}
