import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { GeneralService } from 'src/app/shared/services/generalService.service';
import { environments } from 'src/environments/environments';
import { ArticleModel } from '../interfaces/article.interface';

@Injectable({
  providedIn: 'root',
})
export class ArticlesService {
  private readonly generalService = inject(GeneralService);
  private apiUrl: string = `${environments.api}/backend/articles.php`;
  constructor(private http: HttpClient) {}

  getArticles(): Observable<any> {
    return this.http
      .get(this.apiUrl)
      .pipe(catchError((err) => this.generalService.handleHttpError(err)));
  }

  getArticlesByGender(gender: string): Observable<any> {
    return this.http
      .get(this.apiUrl, { params: { gender: gender } })
      .pipe(catchError((err) => this.generalService.handleHttpError(err)));
  }

  getArticlesByYear(year: number): Observable<any> {
    return this.http
      .get(this.apiUrl, { params: { year: year } })
      .pipe(catchError((err) => this.generalService.handleHttpError(err)));
  }

  getArticlesByLatest(): Observable<any> {
    return this.http
      .get(this.apiUrl, { params: { latest: true } })
      .pipe(catchError((err) => this.generalService.handleHttpError(err)));
  }

  getArticleById(id: number): Observable<any> {
    return this.http
      .get(`${this.apiUrl}/${id}`)
      .pipe(catchError((err) => this.generalService.handleHttpError(err)));
  }

  add(article: FormData): Observable<any> {
    return this.http
      .post(this.apiUrl, article)
      .pipe(catchError((err) => this.generalService.handleHttpError(err)));
  }

  edit(id: number, article: FormData): Observable<any> {
    return this.http
      .post(this.apiUrl, article)
      .pipe(catchError((err) => this.generalService.handleHttpError(err)));
  }

  delete(id: number): Observable<any> {
    return this.http
      .delete(this.apiUrl, { params: { id: id } })
      .pipe(catchError((err) => this.generalService.handleHttpError(err)));
  }

  sortArticlesByTitle(articles: ArticleModel[]): ArticleModel[] {
    return articles.sort((a, b) =>
      a.title.toLowerCase().localeCompare(b.title.toLowerCase())
    );
  }

  sortArticlesById(articles: ArticleModel[]): ArticleModel[] {
    return articles.sort((a, b) => b.id - a.id);
  }

  hasResults(articles: ArticleModel[] | null): boolean {
    return !!articles && articles.length > 0;
  }

  countArticles(articles: ArticleModel[] | null): number {
    return articles?.length ?? 0;
  }
}
