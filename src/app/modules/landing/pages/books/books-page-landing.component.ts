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
import { filter, map, take, tap } from 'rxjs';
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
  private readonly route = inject(ActivatedRoute);

  readonly booksFacade = inject(BooksFacade);
  private readonly booksService = inject(BooksService);
  private readonly generalService = inject(GeneralService);

  books: BookModel[] = [];
  filteredBooks: BookModel[] = [];
  filters: Filter[] = [];
  selectedFilter: string | number = '';
  areThereResults = false;
  typeList = TypeList;
  number = 0;
  currentYear = this.generalService.currentYear;

  @ViewChild(InputSearchComponent)
  private inputSearchComponent!: InputSearchComponent;

  @ViewChild('printArea', { static: false })
  printArea!: ElementRef<HTMLElement>;

  ngOnInit(): void {
    this.filters = [
      { code: 'NOVEDADES', name: 'Novedades' },
      { code: '', name: 'Todos' },
      ...genderFilterBooks,
    ];

    // 2) Si vienes por /books/:id -> deduce GÉNERO; si no hay id: por defecto
    const initialId = this.route.snapshot.paramMap.get('id');
    if (initialId) {
      this.handleDeepLinkById(Number(initialId));
    } else {
      this.filterSelected('NOVEDADES');
    }
    this.route.paramMap
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        map((pm) => pm.get('id')),
        tap((id) => {
          if (id) this.handleDeepLinkById(Number(id));
          else this.filterSelected('NOVEDADES');
        })
      )
      .subscribe();
    // 3) Pintar cuando cambie el listado filtrado
    this.booksFacade.filteredBooks$
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        tap((books) => this.updateBookState(books))
      )
      .subscribe();
  }

  private handleDeepLinkById(id: number): void {
    if (!Number.isFinite(id)) {
      this.filterSelected('NOVEDADES');
      return;
    }

    // Carga el libro -> saca GÉNERO -> filtra por género; si no, NOVEDADES.
    this.booksFacade.loadBookById(id);
    this.booksFacade.selectedBook$
      .pipe(
        filter((b): b is BookModel => !!b),
        takeUntilDestroyed(this.destroyRef),
        take(1)
      )
      .subscribe((book) => {
        const genreCode = this.pickGenreFilterCode(book);

        if (genreCode) {
          this.selectedFilter = genreCode; // 👉 marca el botón del filtro
          this.booksFacade.loadBooksByFilter(genreCode); // 👉 carga por género
          return;
        }

        // (Opcional) fallback si jamás viniera el code:
        this.filterSelected('NOVEDADES');
      });
  }

  // === Filtros ===
  filterSelected(filter: string): void {
    this.selectedFilter = filter;
    this.generalService.clearSearchInput(this.inputSearchComponent);

    if (filter === '') {
      this.booksFacade.loadAllBooks();
    } else {
      this.booksFacade.loadBooksByFilter(filter);
    }
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
  }

  // === Helpers ===
  private pickGenreFilterCode(b: BookModel): string | null {
    const code = (b as any)?.gender;
    return code ? String(code).toUpperCase() : null; // si tus codes en filtros son upper
  }
}
