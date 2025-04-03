import { HttpErrorResponse } from '@angular/common/http';
import { DestroyRef, inject, Injectable } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { BehaviorSubject, catchError, Observable, tap, throwError } from 'rxjs';
import { BookModel } from 'src/app/core/interfaces/book.interface';
import { BooksService } from 'src/app/core/services/books.services';

@Injectable({
  providedIn: 'root',
})
export class BooksFacade {
  private readonly destroyRef = inject(DestroyRef);
  private readonly booksService = inject(BooksService);
  private readonly booksSubject = new BehaviorSubject<BookModel[] | null>(null);
  private readonly filteredBooksSubject = new BehaviorSubject<
    BookModel[] | null
  >(null);
  private readonly selectedBookSubject = new BehaviorSubject<BookModel | null>(
    null
  );

  books$ = this.booksSubject.asObservable();
  selectedBook$ = this.selectedBookSubject.asObservable();
  filteredBooks$ = this.filteredBooksSubject.asObservable();
  currentFilter: string = 'TODOS';

  constructor() {}

  setCurrentFilter(filter: string): void {
    this.currentFilter = filter;
    this.loadBooksByFilter(filter);
  }

  loadBooksByFilter(filter: string): void {
    const loaders: Record<string, () => void> = {
      TODOS: () => this.loadAllBooks(),
      NOVEDADES: () => this.loadBooksByLatest(),
    };

    (loaders[filter] || (() => this.loadBooksByGender(filter)))();
  }

  private reloadCurrentFilter(): void {
    this.loadBooksByFilter(this.currentFilter);
  }

  loadAllBooks(): void {
    this.booksService
      .getBooks()
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        tap((books: BookModel[]) => this.updateBookState(books)),
        catchError(this.handleError)
      )
      .subscribe();
  }

  loadBooksByLatest(): void {
    this.booksService
      .getBooksByLatest()
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        tap((books: BookModel[]) => this.updateBookState(books)),
        catchError(this.handleError)
      )
      .subscribe();
  }

  loadBooksByGender(gender: string): void {
    this.booksService
      .getBooksByGender(gender)
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        tap((books: BookModel[]) => this.updateBookState(books)),
        catchError(this.handleError)
      )
      .subscribe();
  }

  loadBooksByYear(year: number): void {
    this.booksService
      .getBooksByYear(year)
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        tap((books: BookModel[]) => this.updateBookState(books)),
        catchError(this.handleError)
      )
      .subscribe();
  }

  loadBookById(id: number): void {
    this.booksService
      .getBookById(id)
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        tap((book: BookModel) => this.selectedBookSubject.next(book)),
        catchError(this.handleError)
      )
      .subscribe();
  }

  addBook(book: FormData): Observable<FormData> {
    return this.booksService.add(book).pipe(
      takeUntilDestroyed(this.destroyRef),
      tap(() => this.reloadCurrentFilter()),
      catchError(this.handleError)
    );
  }

  editBook(id: number, book: FormData): Observable<FormData> {
    return this.booksService.edit(id, book).pipe(
      takeUntilDestroyed(this.destroyRef),
      tap(() => this.reloadCurrentFilter()),
      catchError(this.handleError)
    );
  }

  deleteBook(id: number): void {
    this.booksService
      .delete(id)
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        tap(() => this.reloadCurrentFilter()),
        catchError(this.handleError)
      )
      .subscribe();
  }

  clearSelectedBook(): void {
    this.selectedBookSubject.next(null);
  }

  applyFilterWord(keyword: string): void {
    const allBooks = this.booksSubject.getValue();

    if (!keyword.trim() || !allBooks) {
      this.filteredBooksSubject.next(allBooks);
      return;
    }
    const search = keyword.trim().toLowerCase();
    const filteredBooks = allBooks.filter(
      (book) =>
        book.title.toLowerCase().includes(search) ||
        (book.author && book.author.toLowerCase().includes(search))
    );

    this.filteredBooksSubject.next(filteredBooks);
  }

  updateBookState(books: BookModel[]): void {
    this.booksSubject.next(books);
    this.filteredBooksSubject.next(books);
  }

  handleError(error: HttpErrorResponse) {
    let errorMessage = '';

    if (error.error instanceof ErrorEvent) {
      // Error del lado del cliente o red
      errorMessage = `Error del cliente o red: ${error.error.message}`;
    } else {
      // El backend retornó un código de error no exitoso
      errorMessage = `Código de error del servidor: ${error.status}\nMensaje: ${error.message}`;
    }

    console.error(errorMessage); // Para depuración

    // Aquí podrías devolver un mensaje amigable para el usuario, o simplemente retornar el error
    return throwError(
      () =>
        new Error(
          'Hubo un problema con la solicitud, inténtelo de nuevo más tarde.'
        )
    );
  }
}
