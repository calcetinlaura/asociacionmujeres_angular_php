import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { BookModel } from 'src/app/core/interfaces/book.interface';
import { GeneralService } from 'src/app/shared/services/generalService.service';
import { environments } from 'src/environments/environments';

@Injectable({
  providedIn: 'root',
})
export class BooksService {
  private readonly generalService = inject(GeneralService);
  private readonly apiUrl: string = `${environments.api}/backend/books.php`;
  constructor(private http: HttpClient) {}

  getBooks(): Observable<any> {
    return this.http
      .get(this.apiUrl)
      .pipe(catchError((err) => this.generalService.handleHttpError(err)));
  }

  getBooksByGender(gender: string): Observable<any> {
    return this.http
      .get(this.apiUrl, { params: { gender: gender } })
      .pipe(catchError((err) => this.generalService.handleHttpError(err)));
  }

  getBooksByYear(year: number): Observable<any> {
    return this.http
      .get(this.apiUrl, { params: { year: year } })
      .pipe(catchError((err) => this.generalService.handleHttpError(err)));
  }

  getBooksByLatest(): Observable<any> {
    return this.http
      .get(this.apiUrl, { params: { latest: true } })
      .pipe(catchError((err) => this.generalService.handleHttpError(err)));
  }

  getBookById(id: number): Observable<any> {
    return this.http
      .get(`${this.apiUrl}/${id}`)
      .pipe(catchError((err) => this.generalService.handleHttpError(err)));
  }

  add(book: FormData): Observable<any> {
    return this.http
      .post(this.apiUrl, book)
      .pipe(catchError((err) => this.generalService.handleHttpError(err)));
  }

  edit(book: FormData): Observable<any> {
    return this.http
      .post(this.apiUrl, book)
      .pipe(catchError((err) => this.generalService.handleHttpError(err)));
  }

  delete(id: number): Observable<any> {
    return this.generalService.deleteOverride<any>(this.apiUrl, { id });
  }

  sortBooksByTitle(books: BookModel[]): BookModel[] {
    return books.sort((a, b) =>
      a.title.toLowerCase().localeCompare(b.title.toLowerCase())
    );
  }

  sortBooksById(books: BookModel[]): BookModel[] {
    return books.sort((a, b) => b.id - a.id);
  }

  hasResults(books: BookModel[] | null): boolean {
    return !!books && books.length > 0;
  }

  countBooks(books: BookModel[] | null): number {
    return books?.length ?? 0;
  }
}
