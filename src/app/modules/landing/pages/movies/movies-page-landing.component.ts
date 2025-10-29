import { CommonModule } from '@angular/common';
import {
  Component,
  computed,
  DestroyRef,
  ElementRef,
  inject,
  OnInit,
  ViewChild,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ActivatedRoute } from '@angular/router';
import { filter, map, take, tap } from 'rxjs';

import { MoviesFacade } from 'src/app/application/movies.facade';
import { MovieModel } from 'src/app/core/interfaces/movie.interface';
import { TypeActionModal, TypeList } from 'src/app/core/models/general.model';

import { FiltersComponent } from 'src/app/shared/components/filters/filters.component';
import { InputSearchComponent } from 'src/app/shared/components/inputs/input-search/input-search.component';
import { NoResultsComponent } from 'src/app/shared/components/no-results/no-results.component';
import { SectionGenericComponent } from 'src/app/shared/components/section-generic/section-generic.component';
import { SpinnerLoadingComponent } from 'src/app/shared/components/spinner-loading/spinner-loading.component';

// Hook reutilizable
import { FiltersFacade } from 'src/app/application/filters.facade';
import { ModalFacade } from 'src/app/application/modal.facade';
import { ModalShellComponent } from 'src/app/shared/components/modal/modal-shell.component';
import { useEntityList } from 'src/app/shared/hooks/use-entity-list';
import { count, sortByTitle } from 'src/app/shared/utils/facade.utils';

@Component({
  selector: 'app-movies-page-landing',
  standalone: true,
  imports: [
    CommonModule,
    FiltersComponent,
    SectionGenericComponent,
    InputSearchComponent,
    NoResultsComponent,
    SpinnerLoadingComponent,
    ModalShellComponent,
  ],
  templateUrl: './movies-page-landing.component.html',
})
export class MoviesPageLandingComponent implements OnInit {
  private readonly destroyRef = inject(DestroyRef);
  private readonly route = inject(ActivatedRoute);

  readonly modalFacade = inject(ModalFacade);
  readonly filtersFacade = inject(FiltersFacade);
  readonly moviesFacade = inject(MoviesFacade);

  // ===== Signals derivadas con useEntityList =====
  readonly list = useEntityList<MovieModel>({
    filtered$: this.moviesFacade.filteredMovies$, // puede emitir null
    map: (arr) => arr,
    sort: (arr) => sortByTitle(arr),
    count: (arr) => count(arr),
  });

  readonly totalSig = this.list.countSig;
  readonly hasResultsSig = computed(() => this.totalSig() > 0);
  readonly TypeList = TypeList;

  @ViewChild(InputSearchComponent)
  private inputSearchComponent!: InputSearchComponent;

  @ViewChild('printArea', { static: false })
  printArea!: ElementRef<HTMLElement>;

  // ======================================================
  //  Ciclo de vida
  // ======================================================
  ngOnInit(): void {
    // Carga inicial de filtros globales desde la FiltersFacade
    this.filtersFacade.loadFiltersFor(TypeList.Movies);

    //  Reacciona a cambios en la ruta (si navegas entre /movies/23, /movies/45, etc.)
    this.route.paramMap
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        map((pm) => pm.get('id')),
        tap((id) => {
          if (id) this.handleDeepLinkById(Number(id));
        })
      )
      .subscribe();
  }
  ngAfterViewInit(): void {
    //  Solo se llama si NO hay id en la URL
    const initialId = this.route.snapshot.paramMap.get('id');
    if (!initialId) {
      setTimeout(() => this.filterSelected(''));
    }
  }

  // ======================================================
  //  Deep-link: carga película por ID y filtra por género
  // ======================================================
  private handleDeepLinkById(id: number): void {
    if (!Number.isFinite(id)) {
      this.filterSelected('');
      return;
    }

    this.moviesFacade.loadMovieById(id);
    this.moviesFacade.selectedMovie$
      .pipe(
        filter((m): m is MovieModel => !!m),
        take(1),
        takeUntilDestroyed(this.destroyRef),
        tap((movie) => {
          const genreCode = this.pickGenreFilterCode(movie);

          if (genreCode) {
            this.filtersFacade.selectFilter(genreCode);
            this.moviesFacade.loadMoviesByFilter(genreCode);
          } else {
            this.filterSelected('');
          }

          // 👉 Abre automáticamente la modal con la película
          this.modalFacade.open(TypeList.Movies, TypeActionModal.Show, movie);
        })
      )
      .subscribe();
  }

  // ======================================================
  //  Filtros y búsqueda
  // ======================================================
  filterSelected(filter: string): void {
    this.filtersFacade.selectFilter(filter);
    if (this.inputSearchComponent) {
      this.filtersFacade.clearSearchInput(this.inputSearchComponent);
    }

    if (filter === '') {
      this.moviesFacade.loadAllMovies();
    } else {
      this.moviesFacade.loadMoviesByFilter(filter);
    }
  }

  applyFilterWord(keyword: string): void {
    this.filtersFacade.setSearch(keyword);
    this.moviesFacade.applyFilterWord(keyword);
  }

  // ======================================================
  //  Acciones con modal
  // ======================================================
  openMovieDetails(movie: MovieModel): void {
    this.modalFacade.open(TypeList.Movies, TypeActionModal.Show, movie);
  }

  closeModal(): void {
    this.modalFacade.close();
  }

  // ======================================================
  //  Helpers
  // ======================================================
  private pickGenreFilterCode(m: MovieModel): string | null {
    const code = (m as any)?.gender;
    return code ? String(code).toUpperCase() : null;
  }
}
