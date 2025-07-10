import { CommonModule } from '@angular/common';
import {
  Component,
  DestroyRef,
  inject,
  OnInit,
  ViewChild,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { tap } from 'rxjs';
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
    imports: [
        CommonModule,
        FiltersComponent,
        SectionGenericComponent,
        InputSearchComponent,
        NoResultsComponent,
        SpinnerLoadingComponent,
    ],
    templateUrl: './movies-page-landing.component.html'
})
export class MoviesPageLandingComponent implements OnInit {
  private readonly destroyRef = inject(DestroyRef);
  private readonly moviesFacade = inject(MoviesFacade);
  private readonly moviesService = inject(MoviesService);
  private readonly generalService = inject(GeneralService);

  movies: MovieModel[] = [];
  filteredMovies: MovieModel[] = [];
  filters: Filter[] = [];
  isLoading = true;
  areThereResults = false;
  typeList = TypeList;
  number = 0;
  selectedFilter = 'ALL';

  @ViewChild(InputSearchComponent)
  private inputSearchComponent!: InputSearchComponent;

  ngOnInit(): void {
    this.filters = [
      { code: 'NOVEDADES', name: 'Novedades' },
      { code: 'ALL', name: 'Todos' },
      ...genderFilterMovies,
    ];

    this.filterSelected('NOVEDADES');

    this.moviesFacade.filteredMovies$
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        tap((movies) => this.updateMovieState(movies))
      )
      .subscribe();
  }

  filterSelected(filter: string): void {
    this.selectedFilter = filter;
    this.generalService.clearSearchInput(this.inputSearchComponent);
    this.moviesFacade.setCurrentFilter(filter);
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
    this.isLoading = false;
  }
}
