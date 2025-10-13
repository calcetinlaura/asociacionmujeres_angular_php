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
import { ActivatedRoute } from '@angular/router';
import { take, tap } from 'rxjs';
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

  movies: MovieModel[] = [];
  filteredMovies: MovieModel[] = [];
  filters: Filter[] = [];
  areThereResults = false;
  typeList = TypeList;
  number = 0;
  selectedFilter: string | number = '';

  @ViewChild(InputSearchComponent)
  private inputSearchComponent!: InputSearchComponent;

  @ViewChild('printArea', { static: false })
  printArea!: ElementRef<HTMLElement>;

  ngOnInit(): void {
    // 1) Filtros: "Todos" + géneros
    this.filters = [{ code: '', name: 'Todos' }, ...genderFilterMovies];

    // 2) Si vienes por /movies/:id -> deduce género; si no hay id: por defecto
    const initialId = this.route.snapshot.paramMap.get('id');
    if (initialId) {
      this.handleDeepLinkById(Number(initialId));
    } else {
      this.filterSelected('');
    }

    // 3) Pintar cuando cambie el listado filtrado
    this.moviesFacade.filteredMovies$
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        tap((movies) => this.updateMovieState(movies))
      )
      .subscribe();
  }

  private handleDeepLinkById(id: number): void {
    if (!Number.isFinite(id)) {
      this.filterSelected('');
      return;
    }

    // Carga la película -> lee gender (code) -> aplica filtro por género
    // (usamos el service directo para no requerir cambios en la facade)
    this.moviesService
      .getMovieById(id)
      .pipe(takeUntilDestroyed(this.destroyRef), take(1))
      .subscribe({
        next: (movie) => {
          const genreCode = this.pickGenreFilterCode(movie);
          if (genreCode) {
            this.selectedFilter = genreCode; // marca el botón
            this.moviesFacade.loadMoviesByFilter(genreCode); // filtra por género
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

  private updateMovieState(movies: MovieModel[] | null): void {
    if (!movies) return;
    this.movies = this.moviesService.sortMoviesByTitle(movies);
    this.filteredMovies = [...this.movies];
    this.number = this.moviesService.countMovies(movies);
    this.areThereResults = this.moviesService.hasResults(movies);
  }

  // === Helpers ===
  private pickGenreFilterCode(m: MovieModel): string | null {
    const code = (m as any)?.gender; // en tu BBDD siempre es el code
    return code ? String(code) : null;
  }
}
