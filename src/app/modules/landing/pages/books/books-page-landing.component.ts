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
import { ModalFacade } from 'src/app/application/modal.facade';
import {
  BookModel,
  genderFilterBooks,
} from 'src/app/core/interfaces/book.interface';
import { Filter } from 'src/app/core/interfaces/general.interface';
import { TypeActionModal, TypeList } from 'src/app/core/models/general.model';
import { BooksService } from 'src/app/core/services/books.services';
import { GeneralService } from 'src/app/core/services/generalService.service';
import { FiltersComponent } from 'src/app/shared/components/filters/filters.component';
import { InputSearchComponent } from 'src/app/shared/components/inputs/input-search/input-search.component';
import { NoResultsComponent } from 'src/app/shared/components/no-results/no-results.component';
import { SectionGenericComponent } from 'src/app/shared/components/section-generic/section-generic.component';
import { SpinnerLoadingComponent } from 'src/app/shared/components/spinner-loading/spinner-loading.component';

// Hooks reutilizables
import { ModalShellComponent } from 'src/app/shared/components/modal/modal-shell.component';
import { useEntityList } from 'src/app/shared/hooks/use-entity-list';

// Facade global de modales

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
    ModalShellComponent,
  ],
  templateUrl: './books-page-landing.component.html',
})
export class BooksPageLandingComponent implements OnInit {
  // ===== Inyección de dependencias =====
  private readonly destroyRef = inject(DestroyRef);
  private readonly route = inject(ActivatedRoute);
  private readonly booksService = inject(BooksService);
  private readonly generalService = inject(GeneralService);
  readonly modalFacade = inject(ModalFacade);
  readonly booksFacade = inject(BooksFacade);

  // ===== Signals derivadas con useEntityList =====
  readonly list = useEntityList<BookModel>({
    filtered$: this.booksFacade.filteredBooks$, // puede emitir null; el hook normaliza
    map: (arr) => arr,
    sort: (arr) => this.booksService.sortBooksByTitle(arr),
    count: (arr) => this.booksService.countBooks(arr),
  });

  readonly totalSig = this.list.countSig;
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

  // ======================================================
  // 🧭 Ciclo de vida
  // ======================================================
  ngOnInit(): void {
    this.filters = [
      { code: 'NOVEDADES', name: 'Novedades' },
      { code: '', name: 'Todos' },
      ...genderFilterBooks,
    ];

    // 1️⃣ Deep-link inicial por ID
    const initialId = this.route.snapshot.paramMap.get('id');
    if (initialId) {
      this.handleDeepLinkById(Number(initialId));
    } else {
      this.filterSelected('NOVEDADES');
    }

    // 2️⃣ Reacciona a cambios de URL
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

  // ======================================================
  // 🎯 Deep-link: carga libro por ID y filtra por género
  // ======================================================
  private handleDeepLinkById(id: number): void {
    if (!Number.isFinite(id)) {
      this.filterSelected('NOVEDADES');
      return;
    }

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
          this.selectedFilter = genreCode;
          this.booksFacade.loadBooksByFilter(genreCode);
        } else {
          this.filterSelected('NOVEDADES');
        }

        // 👉 Abre el modal automáticamente con los detalles del libro
        this.modalFacade.open(TypeList.Books, TypeActionModal.Show, book);
      });
  }

  // ======================================================
  // 🧩 Filtros y búsqueda
  // ======================================================
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

  // ======================================================
  // 📖 Acciones con modal
  // ======================================================
  openBookDetails(book: BookModel): void {
    this.modalFacade.open(TypeList.Books, TypeActionModal.Show, book);
  }

  closeModal(): void {
    this.modalFacade.close();
  }

  // ======================================================
  // 🧠 Helpers
  // ======================================================
  private pickGenreFilterCode(b: BookModel): string | null {
    const code = (b as any)?.gender;
    return code ? String(code).toUpperCase() : null;
  }
}
