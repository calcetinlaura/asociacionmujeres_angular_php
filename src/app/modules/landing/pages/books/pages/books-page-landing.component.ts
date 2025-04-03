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
import { BooksFacade } from 'src/app/application/books.facade';
import {
  BookModel,
  genderFilterBooks,
} from 'src/app/core/interfaces/book.interface';
import { Filter, TypeList } from 'src/app/core/models/general.model';
import { BooksService } from 'src/app/core/services/books.services';
import { FiltersComponent } from 'src/app/modules/landing/components/filters/filters.component';
import { NoResultsComponent } from 'src/app/modules/landing/components/no-results/no-results.component';
import { SectionGenericComponent } from 'src/app/modules/landing/components/section-generic/section-generic.component';
import { InputSearchComponent } from 'src/app/shared/components/inputs/input-search/input-search.component';
import { SpinnerLoadingComponent } from 'src/app/shared/components/spinner-loading/spinner-loading.component';
import { GeneralService } from 'src/app/shared/services/generalService.service';

@Component({
  selector: 'app-books-page-landing',
  standalone: true,
  imports: [
    CommonModule,
    FiltersComponent,
    SectionGenericComponent,
    InputSearchComponent,
    NoResultsComponent,
    SpinnerLoadingComponent,
  ],
  templateUrl: './books-page-landing.component.html',
})
export class BooksPageLandingComponent implements OnInit {
  private readonly destroyRef = inject(DestroyRef);
  private readonly booksFacade = inject(BooksFacade);
  private readonly booksService = inject(BooksService);
  private readonly generalService = inject(GeneralService);

  books: BookModel[] = [];
  filteredBooks: BookModel[] = [];
  filters: Filter[] = [];
  isLoading = true;
  areThereResults = false;
  typeList = TypeList;
  number = 0;
  selectedFilter = 'TODOS';

  @ViewChild(InputSearchComponent)
  private inputSearchComponent!: InputSearchComponent;

  ngOnInit(): void {
    this.filters = [
      { code: 'NOVEDADES', name: 'Novedades' },
      { code: 'TODOS', name: 'Todos' },
      ...genderFilterBooks,
    ];

    this.filterSelected('NOVEDADES');

    this.booksFacade.filteredBooks$
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        tap((books) => this.updateBookState(books))
      )
      .subscribe();
  }

  filterSelected(filter: string): void {
    this.selectedFilter = filter;
    this.generalService.clearSearchInput(this.inputSearchComponent);
    this.booksFacade.setCurrentFilter(filter);
  }

  applyFilterWord(keyword: string): void {
    this.booksFacade.applyFilterWord(keyword);
  }

  updateBookState(books: BookModel[] | null): void {
    if (!books) return;

    this.books = this.booksService.sortBooksByTitle(books);
    this.filteredBooks = [...this.books];
    this.number = this.booksService.countBooks(books);
    this.areThereResults = this.booksService.hasResults(books);
    this.isLoading = false;
  }
}
