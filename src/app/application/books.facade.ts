import { inject, Injectable } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { BehaviorSubject, catchError, finalize, Observable, tap } from 'rxjs';
import { BookModel } from 'src/app/core/interfaces/book.interface';
import { BooksService } from 'src/app/core/services/books.services';
import { includesNormalized, toSearchKey } from '../shared/utils/text.utils';
import { LoadableFacade } from './loadable.facade';

export enum BooksFilter {
  NOVEDADES = 'NOVEDADES',
}

@Injectable({ providedIn: 'root' })
export class BooksFacade extends LoadableFacade {
  private readonly booksService = inject(BooksService);

  // ─────────────────────────────────────────────
  // State
  // ─────────────────────────────────────────────
  private readonly booksSubject = new BehaviorSubject<BookModel[] | null>(null);
  private readonly filteredBooksSubject = new BehaviorSubject<
    BookModel[] | null
  >(null);
  private readonly selectedBookSubject = new BehaviorSubject<BookModel | null>(
    null
  );

  // NEW: loaders separados
  private readonly listLoadingSubject = new BehaviorSubject<boolean>(false);
  private readonly itemLoadingSubject = new BehaviorSubject<boolean>(false);

  // ─────────────────────────────────────────────
  // Public streams
  // ─────────────────────────────────────────────
  readonly books$ = this.booksSubject.asObservable();
  readonly filteredBooks$ = this.filteredBooksSubject.asObservable();
  readonly selectedBook$ = this.selectedBookSubject.asObservable();

  // NEW: usa estos en la UI
  readonly isLoadingList$ = this.listLoadingSubject.asObservable();
  readonly isLoadingItem$ = this.itemLoadingSubject.asObservable();

  private currentFilter: string | null = null;

  // ─────────────────────────────────────────────
  // Cargas de LISTA  → isLoadingList$
  // ─────────────────────────────────────────────
  loadAllBooks(): void {
    this.setCurrentFilter(null);
    this.listLoadingSubject.next(true);
    this.booksService
      .getBooks()
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        catchError((err) => this.generalService.handleHttpError(err)),
        finalize(() => this.listLoadingSubject.next(false))
      )
      .subscribe((books) => this.updateBookState(books));
  }

  loadBooksByFilter(filter: string): void {
    this.setCurrentFilter(filter);
    const loaders: Record<string, () => void> = {
      [BooksFilter.NOVEDADES]: () => this.loadBooksByLatest(),
    };
    (loaders[filter] ?? (() => this.loadBooksByGender(filter)))();
  }

  loadBooksByLatest(): void {
    this.listLoadingSubject.next(true);
    this.booksService
      .getBooksByLatest()
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        catchError((err) => this.generalService.handleHttpError(err)),
        finalize(() => this.listLoadingSubject.next(false))
      )
      .subscribe((books) => this.updateBookState(books));
  }

  loadBooksByGender(gender: string): void {
    this.listLoadingSubject.next(true);
    this.booksService
      .getBooksByGender(gender)
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        catchError((err) => this.generalService.handleHttpError(err)),
        finalize(() => this.listLoadingSubject.next(false))
      )
      .subscribe((books) => this.updateBookState(books));
  }

  loadBooksByYear(year: number): void {
    this.listLoadingSubject.next(true);
    this.booksService
      .getBooksByYear(year)
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        catchError((err) => this.generalService.handleHttpError(err)),
        finalize(() => this.listLoadingSubject.next(false))
      )
      .subscribe((books) => this.updateBookState(books));
  }

  // ─────────────────────────────────────────────
  // Cargas/acciones de ITEM  → isLoadingItem$
  // ─────────────────────────────────────────────
  loadBookById(id: number): void {
    this.itemLoadingSubject.next(true);
    this.booksService
      .getBookById(id)
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        catchError((err) => this.generalService.handleHttpError(err)),
        finalize(() => this.itemLoadingSubject.next(false))
      )
      .subscribe((book) => this.selectedBookSubject.next(book));
  }

  addBook(book: FormData): Observable<FormData> {
    this.itemLoadingSubject.next(true);
    return this.booksService.add(book).pipe(
      takeUntilDestroyed(this.destroyRef),
      tap(() => this.reloadCurrentFilter()),
      catchError((err) => this.generalService.handleHttpError(err)),
      finalize(() => this.itemLoadingSubject.next(false))
    );
  }

  editBook(book: FormData): Observable<FormData> {
    this.itemLoadingSubject.next(true);
    return this.booksService.edit(book).pipe(
      takeUntilDestroyed(this.destroyRef),
      tap(() => this.reloadCurrentFilter()),
      catchError((err) => this.generalService.handleHttpError(err)),
      finalize(() => this.itemLoadingSubject.next(false))
    );
  }

  deleteBook(id: number): void {
    this.itemLoadingSubject.next(true);
    this.booksService
      .delete(id)
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        catchError((err) => this.generalService.handleHttpError(err)),
        finalize(() => this.itemLoadingSubject.next(false))
      )
      .subscribe(() => this.reloadCurrentFilter());
  }

  // ─────────────────────────────────────────────
  // Utilidades
  // ─────────────────────────────────────────────
  clearSelectedBook(): void {
    this.selectedBookSubject.next(null);
  }

  applyFilterWord(keyword: string): void {
    const all = this.booksSubject.getValue();

    if (!all) {
      this.filteredBooksSubject.next(all);
      return;
    }

    if (!toSearchKey(keyword)) {
      this.filteredBooksSubject.next(all);
      return;
    }

    const filtered = all.filter((b) =>
      [b.title, b.author].some((field) => includesNormalized(field, keyword))
    );

    this.filteredBooksSubject.next(filtered);
  }

  setCurrentFilter(filter: string | null): void {
    this.currentFilter = filter;
  }

  private reloadCurrentFilter(): void {
    if (this.currentFilter === null) {
      this.loadAllBooks();
      return;
    }
    this.loadBooksByFilter(this.currentFilter);
  }

  private updateBookState(books: BookModel[]): void {
    this.booksSubject.next(books);
    this.filteredBooksSubject.next(books);
  }
}
