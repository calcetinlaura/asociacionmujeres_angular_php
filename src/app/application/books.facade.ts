import { inject, Injectable } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { BehaviorSubject, EMPTY, Observable } from 'rxjs';
import { catchError, finalize, tap } from 'rxjs/operators';
import { BookModel } from 'src/app/core/interfaces/book.interface';
import { BooksService } from 'src/app/core/services/books.services';
import {
  count,
  filterByKeyword,
  hasResults,
} from '../shared/utils/facade.utils';
import { LoadableFacade } from './loadable.facade';

export enum BooksFilter {
  NOVEDADES = 'NOVEDADES',
}

@Injectable({ providedIn: 'root' })
export class BooksFacade extends LoadableFacade {
  private readonly booksService = inject(BooksService);

  // ───────── STATE ─────────
  private readonly booksSubject = new BehaviorSubject<BookModel[] | null>(null);
  private readonly filteredBooksSubject = new BehaviorSubject<
    BookModel[] | null
  >(null);
  private readonly selectedBookSubject = new BehaviorSubject<BookModel | null>(
    null
  );

  private readonly listLoadingSubject = new BehaviorSubject<boolean>(false);
  private readonly itemLoadingSubject = new BehaviorSubject<boolean>(false);

  // ───────── PUBLIC STREAMS ─────────
  readonly books$ = this.booksSubject.asObservable();
  readonly filteredBooks$ = this.filteredBooksSubject.asObservable();
  readonly selectedBook$ = this.selectedBookSubject.asObservable();
  readonly isLoadingList$ = this.listLoadingSubject.asObservable();
  readonly isLoadingItem$ = this.itemLoadingSubject.asObservable();

  private currentFilter: string | null = null;

  // ───────── LISTAS → isLoadingList$ ─────────
  loadAllBooks(): void {
    this.setCurrentFilter(null);
    this.listLoadingSubject.next(true);

    this.booksService
      .getBooks()
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        tap((books) => this.updateBookState(books)),
        catchError((err) => {
          this.generalService.handleHttpError(err);
          return EMPTY;
        }),
        finalize(() => this.listLoadingSubject.next(false))
      )
      .subscribe();
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
        tap((books) => this.updateBookState(books)),
        catchError((err) => {
          this.generalService.handleHttpError(err);
          return EMPTY;
        }),
        finalize(() => this.listLoadingSubject.next(false))
      )
      .subscribe();
  }

  loadBooksByGender(gender: string): void {
    this.listLoadingSubject.next(true);

    this.booksService
      .getBooksByGender(gender)
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        tap((books) => this.updateBookState(books)),
        catchError((err) => {
          this.generalService.handleHttpError(err);
          return EMPTY;
        }),
        finalize(() => this.listLoadingSubject.next(false))
      )
      .subscribe();
  }

  loadBooksByYear(year: number): void {
    this.listLoadingSubject.next(true);

    this.booksService
      .getBooksByYear(year)
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        tap((books) => this.updateBookState(books)),
        catchError((err) => {
          this.generalService.handleHttpError(err);
          return EMPTY;
        }),
        finalize(() => this.listLoadingSubject.next(false))
      )
      .subscribe();
  }

  // ───────── ITEM → isLoadingItem$ ─────────
  loadBookById(id: number): void {
    this.itemLoadingSubject.next(true);

    this.booksService
      .getBookById(id)
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        tap((book) => this.selectedBookSubject.next(book)),
        catchError((err) => {
          this.generalService.handleHttpError(err);
          return EMPTY;
        }),
        finalize(() => this.itemLoadingSubject.next(false))
      )
      .subscribe();
  }

  // ───────── CRUD ─────────
  addBook(book: FormData): Observable<FormData> {
    this.itemLoadingSubject.next(true);

    return this.booksService.add(book).pipe(
      takeUntilDestroyed(this.destroyRef),
      tap(() => this.reloadCurrentFilter()),
      catchError((err) => {
        this.generalService.handleHttpError(err);
        return EMPTY;
      }),
      finalize(() => this.itemLoadingSubject.next(false))
    );
  }

  editBook(book: FormData): Observable<FormData> {
    this.itemLoadingSubject.next(true);

    return this.booksService.edit(book).pipe(
      takeUntilDestroyed(this.destroyRef),
      tap(() => this.reloadCurrentFilter()),
      catchError((err) => {
        this.generalService.handleHttpError(err);
        return EMPTY;
      }),
      finalize(() => this.itemLoadingSubject.next(false))
    );
  }

  deleteBook(id: number): void {
    this.itemLoadingSubject.next(true);

    this.booksService
      .delete(id)
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        tap(() => this.reloadCurrentFilter()),
        catchError((err) => {
          this.generalService.handleHttpError(err);
          return EMPTY;
        }),
        finalize(() => this.itemLoadingSubject.next(false))
      )
      .subscribe();
  }

  // ───────── HELPERS ─────────
  clearSelectedBook(): void {
    this.selectedBookSubject.next(null);
  }

  applyFilterWord(keyword: string): void {
    const all = this.booksSubject.getValue();
    this.filteredBooksSubject.next(
      filterByKeyword(all, keyword, [(b) => b.title, (b) => b.author])
    );
  }

  setCurrentFilter(filter: string | null): void {
    this.currentFilter = filter;
  }

  private reloadCurrentFilter(): void {
    if (this.currentFilter === null) {
      this.loadAllBooks();
    } else {
      this.loadBooksByFilter(this.currentFilter);
    }
  }

  private updateBookState(books: BookModel[]): void {
    this.booksSubject.next(books);
    this.filteredBooksSubject.next(books);
  }

  get totalBooks(): number {
    return count(this.booksSubject.getValue());
  }

  get hasBooks(): boolean {
    return hasResults(this.booksSubject.getValue());
  }
}
