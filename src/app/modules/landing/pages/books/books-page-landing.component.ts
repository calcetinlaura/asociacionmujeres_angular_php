import { CommonModule } from '@angular/common';
import {
  Component,
  DestroyRef,
  ElementRef,
  OnInit,
  ViewChild,
  computed,
  inject,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ActivatedRoute } from '@angular/router';
import { filter, map, take, tap } from 'rxjs';
import { BooksFacade } from 'src/app/application/books.facade';
import {
  BookModel,
  genderFilterBooks,
} from 'src/app/core/interfaces/book.interface';
import { Filter } from 'src/app/core/interfaces/general.interface';
import { TypeList } from 'src/app/core/models/general.model';
import { BooksService } from 'src/app/core/services/books.services';
import { GeneralService } from 'src/app/core/services/generalService.service';
import { FiltersComponent } from 'src/app/shared/components/filters/filters.component';
import { InputSearchComponent } from 'src/app/shared/components/inputs/input-search/input-search.component';
import { NoResultsComponent } from 'src/app/shared/components/no-results/no-results.component';
import { SectionGenericComponent } from 'src/app/shared/components/section-generic/section-generic.component';
import { SpinnerLoadingComponent } from 'src/app/shared/components/spinner-loading/spinner-loading.component';

// Reutilizable
import { useEntityList } from 'src/app/shared/hooks/use-entity-list';

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

  // ===== Signals derivadas con useEntityList =====
  readonly list = useEntityList<BookModel>({
    filtered$: this.booksFacade.filteredBooks$, // puede emitir null; el hook normaliza
    map: (arr) => arr, // opcional: transforma los datos si lo necesitas
    sort: (arr) => this.booksService.sortBooksByTitle(arr),
    count: (arr) => this.booksService.countBooks(arr),
  });

  // Conteo y estado de resultados como signals
  readonly totalSig = this.list.countSig; // alias conveniente
  readonly hasResultsSig = computed(() => this.totalSig() > 0);

  // ===== Estado de filtros / UI =====
  filters: Filter[] = [];
  selectedFilter: string | number = '';
  typeList = TypeList;
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

    // 1) Arranque: deep-link por id si viene, si no -> NOVEDADES
    const initialId = this.route.snapshot.paramMap.get('id');
    if (initialId) {
      this.handleDeepLinkById(Number(initialId));
    } else {
      this.filterSelected('NOVEDADES');
    }

    // 2) Reacciona a cambios en la ruta (navegación dentro de la landing)
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

        // Fallback
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

  // === Helpers ===
  private pickGenreFilterCode(b: BookModel): string | null {
    const code = (b as any)?.gender;
    return code ? String(code).toUpperCase() : null; // si tus codes en filtros son upper
  }
}
