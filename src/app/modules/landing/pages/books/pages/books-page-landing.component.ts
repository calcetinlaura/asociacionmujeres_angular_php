import { CommonModule } from '@angular/common';
import {
  Component,
  DestroyRef,
  inject,
  OnInit,
  ViewChild,
} from '@angular/core';
import { FiltersComponent } from '../../../components/filters/filters.component';
import { TypeList, filterBooks } from 'src/app/core/models/general.model';
import { BooksService } from 'src/app/core/services/books.services';
import { SectionGenericComponent } from '../../../components/section-generic/section-generic.component';
import { tap } from 'rxjs';
import { BookModel } from 'src/app/core/interfaces/book.interface';
import { InputSearchComponent } from '../../../../../shared/components/inputs/input-search/input-search.component';
import { BooksFacade } from 'src/app/application';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { NoResultsComponent } from '../../../components/no-results/no-results.component';
import { SpinnerLoadingComponent } from '../../../components/spinner-loading/spinner-loading.component';

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
  providers: [BooksService],
})
export class BooksPageLandingComponent implements OnInit {
  private destroyRef = inject(DestroyRef);
  private booksFacade = inject(BooksFacade);

  books: BookModel[] = [];
  filteredBooks: BookModel[] = [];
  isLoading: boolean = true;
  areThereResults: boolean = false;
  filterGenderBooks = filterBooks;
  typeList = TypeList;
  number: number = 0;
  selectedFilter: string = 'TODOS';

  @ViewChild(InputSearchComponent)
  private inputSearchComponent!: InputSearchComponent;

  ngOnInit(): void {
    this.filterSelected('NOVEDADES');
  }

  filterSelected(filter: string): void {
    this.selectedFilter = filter;
    if (this.inputSearchComponent) {
      this.inputSearchComponent.clearInput();
    }
    switch (filter) {
      case 'TODOS':
        this.booksFacade.loadAllBooks();
        break;
      case 'NOVEDADES':
        this.booksFacade.loadBooksByLatest();
        break;
      default:
        this.booksFacade.loadBooksByGender(filter);
        break;
    }
    this.booksFacade.books$
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        tap((books) => this.updateBookState(books))
      )
      .subscribe();
  }

  applyFilter(keyword: string): void {
    this.booksFacade.applyFilter(keyword);
    this.booksFacade.filteredBooks$
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        tap((books) => {
          this.updateBookState(books);
        })
      )
      .subscribe();
  }

  private updateBookState(books: BookModel[] | null): void {
    if (books === null) {
      return;
    }
    this.books = books.sort((a, b) =>
      a.title.toLowerCase().localeCompare(b.title.toLowerCase())
    );
    this.filteredBooks = [...this.books];
    this.number = this.books.length;
    this.areThereResults = this.number > 0;
    this.isLoading = false;
  }
}
