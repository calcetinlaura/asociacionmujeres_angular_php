import { CommonModule } from '@angular/common';
import {
  Component,
  DestroyRef,
  inject,
  OnInit,
  ViewChild,
} from '@angular/core';
import { FiltersComponent } from '../../../components/filters/filters.component';
import { TypeList, filterMovies } from 'src/app/core/models/general.model';
import { MoviesService } from 'src/app/core/services/movies.services';
import { SectionGenericComponent } from '../../../components/section-generic/section-generic.component';
import { tap } from 'rxjs';
import { MovieModel } from 'src/app/core/interfaces/movie.interface';
import { InputSearchComponent } from '../../../../../shared/components/inputs/input-search/input-search.component';
import { MoviesFacade } from 'src/app/application';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { NoResultsComponent } from '../../../components/no-results/no-results.component';
import { SpinnerLoadingComponent } from '../../../components/spinner-loading/spinner-loading.component';

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
  providers: [MoviesService],
})
export class MoviesPageLandingComponent implements OnInit {
  private destroyRef = inject(DestroyRef);
  private moviesFacade = inject(MoviesFacade);

  movies: MovieModel[] = [];
  filteredMovies: MovieModel[] = [];
  isLoading: boolean = true;
  areThereResults: boolean = false;
  filterGenderMovies = filterMovies;
  typeList = TypeList;
  number: number = 0;
  selectedGenderFilter: string = 'TODOS';

  @ViewChild(InputSearchComponent)
  private inputSearchComponent!: InputSearchComponent;

  ngOnInit(): void {
    this.filterSelected('NOVEDADES');
  }

  filterSelected(filter: string): void {
    this.selectedGenderFilter = filter;
    if (this.inputSearchComponent) {
      this.inputSearchComponent.clearInput();
    }
    switch (filter) {
      case 'TODOS':
        this.moviesFacade.loadAllMovies();
        break;
      case 'NOVEDADES':
        this.moviesFacade.loadMoviesByLatest();
        break;
      default:
        this.moviesFacade.loadMoviesByGender(filter);
        break;
    }
    this.moviesFacade.movies$
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        tap((movies) => this.updateMovieState(movies))
      )
      .subscribe();
  }

  applyFilter(keyword: string): void {
    this.moviesFacade.applyFilter(keyword);
    this.moviesFacade.filteredMovies$
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        tap((movies) => {
          this.updateMovieState(movies);
        })
      )
      .subscribe();
  }

  private updateMovieState(movies: MovieModel[] | null): void {
    if (movies === null) {
      return;
    }
    this.movies = movies.sort((a, b) =>
      a.title.toLowerCase().localeCompare(b.title.toLowerCase())
    );
    this.filteredMovies = [...this.movies];
    this.number = this.filteredMovies.length;
    this.areThereResults = this.filteredMovies.length > 0;
    this.isLoading = false;
  }
}
