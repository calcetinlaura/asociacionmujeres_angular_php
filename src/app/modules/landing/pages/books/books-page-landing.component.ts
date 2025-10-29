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
import { FiltersFacade } from 'src/app/application/filters.facade';
import { ModalFacade } from 'src/app/application/modal.facade';

import { BookModel } from 'src/app/core/interfaces/book.interface';
import { TypeActionModal, TypeList } from 'src/app/core/models/general.model';
import { BooksService } from 'src/app/core/services/books.services';

import { FiltersComponent } from 'src/app/shared/components/filters/filters.component';
import { InputSearchComponent } from 'src/app/shared/components/inputs/input-search/input-search.component';
import { ModalShellComponent } from 'src/app/shared/components/modal/modal-shell.component';
import { NoResultsComponent } from 'src/app/shared/components/no-results/no-results.component';
import { SectionGenericComponent } from 'src/app/shared/components/section-generic/section-generic.component';
import { SpinnerLoadingComponent } from 'src/app/shared/components/spinner-loading/spinner-loading.component';

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
    ModalShellComponent,
  ],
  templateUrl: './books-page-landing.component.html',
})
export class BooksPageLandingComponent implements OnInit {
  private readonly destroyRef = inject(DestroyRef);
  private readonly route = inject(ActivatedRoute);
  private readonly booksService = inject(BooksService);

  readonly modalFacade = inject(ModalFacade);
  readonly filtersFacade = inject(FiltersFacade);
  readonly booksFacade = inject(BooksFacade);

  // ===== Lista derivada con useEntityList =====
  readonly list = useEntityList<BookModel>({
    filtered$: this.booksFacade.filteredBooks$,
    map: (arr) => arr,
    sort: (arr) => this.booksService.sortBooksByTitle(arr),
    count: (arr) => this.booksService.countBooks(arr),
  });

  readonly totalSig = this.list.countSig;
  readonly hasResultsSig = computed(() => this.totalSig() > 0);
  readonly TypeList = TypeList;

  @ViewChild(InputSearchComponent)
  private inputSearchComponent!: InputSearchComponent;

  @ViewChild('printArea', { static: false })
  printArea!: ElementRef<HTMLElement>;

  // ======================================================
  // 🧭 Ciclo de vida
  // ======================================================
  ngOnInit(): void {
    // Carga inicial de filtros globales desde la FiltersFacade
    this.filtersFacade.loadFiltersFor(TypeList.Books);

    // Reacciona a cambios de URL (si navegas entre /books/123 → /books/456)
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
      setTimeout(() => this.filterSelected('NOVEDADES'));
    }
  }

  // ======================================================
  //  Deep-link: carga libro por ID y filtra por género
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
        take(1),
        takeUntilDestroyed(this.destroyRef),
        tap((book) => {
          const genreCode = this.pickGenreFilterCode(book);

          if (genreCode) {
            this.filtersFacade.selectFilter(genreCode);
            this.booksFacade.loadBooksByFilter(genreCode);
          } else {
            this.filterSelected('NOVEDADES');
          }

          this.modalFacade.open(TypeList.Books, TypeActionModal.Show, book);
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
      this.booksFacade.loadAllBooks();
    } else {
      this.booksFacade.loadBooksByFilter(filter);
    }
  }

  applyFilterWord(keyword: string): void {
    this.filtersFacade.setSearch(keyword);
    this.booksFacade.applyFilterWord(keyword);
  }

  // ======================================================
  //  Acciones con modal
  // ======================================================
  openBookDetails(book: BookModel): void {
    this.modalFacade.open(TypeList.Books, TypeActionModal.Show, book);
  }

  closeModal(): void {
    this.modalFacade.close();
  }

  // ======================================================
  //  Helpers
  // ======================================================
  private pickGenreFilterCode(b: BookModel): string | null {
    const code = (b as any)?.gender;
    return code ? String(code).toUpperCase() : null;
  }
}
