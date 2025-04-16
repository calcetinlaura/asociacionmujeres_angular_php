import { DestroyRef, inject, Injectable } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { BehaviorSubject, catchError, Observable, tap } from 'rxjs';
import { ArticleModel } from 'src/app/core/interfaces/article.interface';
import { ArticlesService } from 'src/app/core/services/articles.services';
import { GeneralService } from '../shared/services/generalService.service';

@Injectable({
  providedIn: 'root',
})
export class ArticlesFacade {
  private readonly destroyRef = inject(DestroyRef);
  private readonly articlesService = inject(ArticlesService);
  private readonly generalService = inject(GeneralService);
  private readonly articlesSubject = new BehaviorSubject<ArticleModel[] | null>(
    null
  );
  private readonly filteredArticlesSubject = new BehaviorSubject<
    ArticleModel[] | null
  >(null);
  private readonly selectedArticleSubject =
    new BehaviorSubject<ArticleModel | null>(null);

  articles$ = this.articlesSubject.asObservable();
  selectedArticle$ = this.selectedArticleSubject.asObservable();
  filteredArticles$ = this.filteredArticlesSubject.asObservable();

  constructor() {}

  loadAllArticles(): void {
    this.articlesService
      .getArticles()
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        tap((articles: ArticleModel[]) => this.updateArticleState(articles)),
        catchError((err) => this.generalService.handleHttpError(err))
      )
      .subscribe();
  }

  loadArticleById(id: number): void {
    this.articlesService
      .getArticleById(id)
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        tap((article: ArticleModel) =>
          this.selectedArticleSubject.next(article)
        ),
        catchError((err) => this.generalService.handleHttpError(err))
      )
      .subscribe();
  }

  addArticle(article: FormData): Observable<any> {
    return this.articlesService.add(article).pipe(
      takeUntilDestroyed(this.destroyRef),
      tap(() => this.loadAllArticles()),
      catchError((err) => this.generalService.handleHttpError(err))
    );
  }

  editArticle(id: number, article: FormData): Observable<any> {
    return this.articlesService.edit(id, article).pipe(
      takeUntilDestroyed(this.destroyRef),
      tap(() => this.loadAllArticles()),
      catchError((err) => this.generalService.handleHttpError(err))
    );
  }

  deleteArticle(id: number): void {
    this.articlesService
      .delete(id)
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        tap(() => this.loadAllArticles()),
        catchError((err) => this.generalService.handleHttpError(err))
      )
      .subscribe();
  }

  clearSelectedArticle(): void {
    this.selectedArticleSubject.next(null);
  }

  applyFilterWord(keyword: string): void {
    const allArticles = this.articlesSubject.getValue();

    if (!keyword.trim() || !allArticles) {
      this.filteredArticlesSubject.next(allArticles);
      return;
    }
    const search = keyword.trim().toLowerCase();
    const filteredArticles = allArticles.filter((article) =>
      article.title.toLowerCase().includes(search)
    );

    this.filteredArticlesSubject.next(filteredArticles);
  }

  updateArticleState(articles: ArticleModel[]): void {
    this.articlesSubject.next(articles);
    this.filteredArticlesSubject.next(articles);
  }
}
