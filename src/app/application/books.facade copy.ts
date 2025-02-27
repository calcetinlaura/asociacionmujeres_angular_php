import { DestroyRef, inject, Injectable } from '@angular/core';
import { BehaviorSubject, catchError, Observable, tap, throwError } from 'rxjs';
import { BooksService } from '../core/services/books.services';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { BookModel } from '../core/interfaces/book.interface';
import { HttpErrorResponse } from '@angular/common/http';

@Injectable({
  providedIn: 'root',
})
export class BooksFacade {
  private destroyRef = inject(DestroyRef);
  private booksService = inject(BooksService);
  private booksSubject = new BehaviorSubject<BookModel[] | null>(null);
  private filteredBooksSubject = new BehaviorSubject<BookModel[] | null>(null);
  private selectedBookSubject = new BehaviorSubject<BookModel | null>(null);

  books$ = this.booksSubject.asObservable();
  selectedBook$ = this.selectedBookSubject.asObservable();
  filteredBooks$ = this.filteredBooksSubject.asObservable();

  constructor() {}

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

  addBook(formData: FormData): Observable<BookModel> {
    return this.booksService.add(formData).pipe(
      tap(() => this.loadAllBooks()), // Cargar todos los libros después de agregar uno
      catchError(this.handleError)
    );
  }

  editBook(id: number, book: FormData): Observable<any> {
    console.log('DATOS EN EDITBOOK:');
    for (let [key, value] of book as any) {
      console.log(`${key}: ${value instanceof File ? value.name : value}`);
    }
    return this.booksService.edit(id, book).pipe(
      takeUntilDestroyed(this.destroyRef),
      tap(() => this.loadAllBooks()),
      catchError(this.handleError)
    );
  }

  deleteBook(id: number): void {
    this.booksService
      .delete(id)
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        tap(() => this.loadAllBooks()),
        catchError(this.handleError)
      )
      .subscribe();
  }

  clearSelectedBook(): void {
    this.selectedBookSubject.next(null);
  }

  applyFilter(keyword: string): void {
    const searchValue = keyword.toLowerCase();
    const allBooks = this.booksSubject.getValue();

    if (!searchValue) {
      this.filteredBooksSubject.next(allBooks);
    } else {
      const filteredBooks = this.booksSubject
        .getValue()!
        .filter(
          (book) =>
            book.title.toLowerCase().includes(searchValue) ||
            (book.author && book.author.toLowerCase().includes(searchValue))
        );

      this.filteredBooksSubject.next(filteredBooks);
    }
  }

  updateBookState(books: BookModel[]): void {
    this.booksSubject.next(books);
    this.filteredBooksSubject.next(books); // Actualiza también los libros filtrados
  }

  // Método para manejar errores
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
