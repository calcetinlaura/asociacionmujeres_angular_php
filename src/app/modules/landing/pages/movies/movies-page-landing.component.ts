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
import { take } from 'rxjs';

import { MoviesFacade } from 'src/app/application/movies.facade';
import {
  genderFilterMovies,
  MovieModel,
} from 'src/app/core/interfaces/movie.interface';
import { Filter, TypeList } from 'src/app/core/models/general.model';
import { MoviesService } from 'src/app/core/services/movies.services';

import { FiltersComponent } from 'src/app/modules/landing/components/filters/filters.component';
import { NoResultsComponent } from 'src/app/modules/landing/components/no-results/no-results.component';
import { SectionGenericComponent } from 'src/app/modules/landing/components/section-generic/section-generic.component';
import { InputSearchComponent } from 'src/app/shared/components/inputs/input-search/input-search.component';
import { SpinnerLoadingComponent } from 'src/app/shared/components/spinner-loading/spinner-loading.component';
import { GeneralService } from 'src/app/shared/services/generalService.service';

// Hook reutilizable
import { useEntityList } from 'src/app/shared/hooks/use-entity-list';

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
  ],
  templateUrl: './movies-page-landing.component.html',
})
export class MoviesPageLandingComponent implements OnInit {
  private readonly destroyRef = inject(DestroyRef);
  private readonly route = inject(ActivatedRoute);

  readonly moviesFacade = inject(MoviesFacade);
  private readonly moviesService = inject(MoviesService);
  private readonly generalService = inject(GeneralService);

  // ===== Signals derivadas con useEntityList =====
  readonly list = useEntityList<MovieModel>({
    filtered$: this.moviesFacade.filteredMovies$, // puede emitir null; el hook lo normaliza
    map: (arr) => arr, // opcional: transformar datos para la vista
    sort: (arr) => this.moviesService.sortMoviesByTitle(arr),
    count: (arr) => this.moviesService.countMovies(arr),
  });

  // Conteo y estado de resultados como signals
  readonly totalSig = this.list.countSig;
  readonly hasResultsSig = computed(() => this.totalSig() > 0);

  // ===== Filtros / UI =====
  filters: Filter[] = [];
  selectedFilter: string | number = '';
  typeList = TypeList;

  @ViewChild(InputSearchComponent)
  private inputSearchComponent!: InputSearchComponent;

  @ViewChild('printArea', { static: false })
  printArea!: ElementRef<HTMLElement>;

  ngOnInit(): void {
    // 1) Filtros: "Todos" + géneros
    this.filters = [{ code: '', name: 'Todos' }, ...genderFilterMovies];

    // 2) Ruta inicial: /movies/:id -> filtra por género de esa película; si no, "Todos"
    const initialId = this.route.snapshot.paramMap.get('id');
    if (initialId) {
      this.handleDeepLinkById(Number(initialId));
    } else {
      this.filterSelected('');
    }
  }

  private handleDeepLinkById(id: number): void {
    if (!Number.isFinite(id)) {
      this.filterSelected('');
      return;
    }

    // Carga la película -> extrae género -> aplica filtro por género
    this.moviesService
      .getMovieById(id)
      .pipe(takeUntilDestroyed(this.destroyRef), take(1))
      .subscribe({
        next: (movie) => {
          const genreCode = this.pickGenreFilterCode(movie);
          if (genreCode) {
            this.selectedFilter = genreCode; // marca el filtro activo
            this.moviesFacade.loadMoviesByFilter(genreCode); // carga por género
          } else {
            this.filterSelected(''); // fallback: Todos
          }
        },
        error: () => this.filterSelected(''),
      });
  }

  // === Filtros ===
  filterSelected(filter: string): void {
    this.selectedFilter = filter;
    this.generalService.clearSearchInput?.(this.inputSearchComponent);

    if (filter === '') {
      this.moviesFacade.loadAllMovies();
    } else {
      this.moviesFacade.loadMoviesByFilter(filter);
    }
  }

  applyFilterWord(keyword: string): void {
    this.moviesFacade.applyFilterWord(keyword);
  }

  // === Helpers ===
  private pickGenreFilterCode(m: MovieModel): string | null {
    const code = (m as any)?.gender; // en tu BBDD es el code
    return code ? String(code) : null;
  }
}
