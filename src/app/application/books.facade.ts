import { inject, Injectable } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { BehaviorSubject, catchError, Observable, tap } from 'rxjs';
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

  // State propio
  private readonly booksSubject = new BehaviorSubject<BookModel[] | null>(null);
  private readonly filteredBooksSubject = new BehaviorSubject<
    BookModel[] | null
  >(null);
  private readonly selectedBookSubject = new BehaviorSubject<BookModel | null>(
    null
  );

  // Streams públicos
  readonly books$ = this.booksSubject.asObservable();
  readonly filteredBooks$ = this.filteredBooksSubject.asObservable();
  readonly selectedBook$ = this.selectedBookSubject.asObservable();

  private currentFilter: string | null = null;

  loadAllBooks(): void {
    this.setCurrentFilter(null);
    this.executeWithLoading(this.booksService.getBooks(), (books) =>
      this.updateBookState(books)
    );
  }

  loadBooksByFilter(filter: string): void {
    this.setCurrentFilter(filter);
    const loaders: Record<string, () => void> = {
      [BooksFilter.NOVEDADES]: () => this.loadBooksByLatest(),
    };
    (loaders[filter] ?? (() => this.loadBooksByGender(filter)))();
  }

  loadBooksByLatest(): void {
    this.executeWithLoading(this.booksService.getBooksByLatest(), (books) =>
      this.updateBookState(books)
    );
  }

  loadBooksByGender(gender: string): void {
    this.executeWithLoading(
      this.booksService.getBooksByGender(gender),
      (books) => this.updateBookState(books)
    );
  }

  loadBooksByYear(year: number): void {
    this.executeWithLoading(this.booksService.getBooksByYear(year), (books) =>
      this.updateBookState(books)
    );
  }

  loadBookById(id: number): void {
    this.executeWithLoading(this.booksService.getBookById(id), (book) =>
      this.selectedBookSubject.next(book)
    );
  }

  addBook(book: FormData): Observable<FormData> {
    return this.wrapWithLoading(this.booksService.add(book)).pipe(
      takeUntilDestroyed(this.destroyRef),
      tap(() => this.reloadCurrentFilter()),
      catchError((err) => this.generalService.handleHttpError(err))
    );
  }

  editBook(book: FormData): Observable<FormData> {
    return this.wrapWithLoading(this.booksService.edit(book)).pipe(
      takeUntilDestroyed(this.destroyRef),
      tap(() => this.reloadCurrentFilter()),
      catchError((err) => this.generalService.handleHttpError(err))
    );
  }

  deleteBook(id: number): void {
    this.executeWithLoading(this.booksService.delete(id), () =>
      this.reloadCurrentFilter()
    );
  }

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
