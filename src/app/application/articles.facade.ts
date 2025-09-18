import { inject, Injectable } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { BehaviorSubject, catchError, Observable, tap } from 'rxjs';
import { ArticleModel } from 'src/app/core/interfaces/article.interface';
import { ArticlesService } from 'src/app/core/services/articles.services';
import { includesNormalized, toSearchKey } from '../shared/utils/text.utils';
import { LoadableFacade } from './loadable.facade';

@Injectable({
  providedIn: 'root',
})
export class ArticlesFacade extends LoadableFacade {
  private readonly articlesService = inject(ArticlesService);

  // State propio
  private readonly articlesSubject = new BehaviorSubject<ArticleModel[] | null>(
    null
  );
  private readonly filteredArticlesSubject = new BehaviorSubject<
    ArticleModel[] | null
  >(null);
  private readonly selectedArticleSubject =
    new BehaviorSubject<ArticleModel | null>(null);
  // Streams públicos
  articles$ = this.articlesSubject.asObservable();
  selectedArticle$ = this.selectedArticleSubject.asObservable();
  filteredArticles$ = this.filteredArticlesSubject.asObservable();

  // ---------- API pública

  loadAllArticles(): void {
    this.executeWithLoading(this.articlesService.getArticles(), (articles) =>
      this.updateArticleState(articles)
    );
  }

  loadArticleById(id: number): void {
    this.executeWithLoading(
      this.articlesService.getArticleById(id),
      (article) => this.selectedArticleSubject.next(article)
    );
  }

  addArticle(article: FormData): Observable<FormData> {
    return this.wrapWithLoading(this.articlesService.add(article)).pipe(
      takeUntilDestroyed(this.destroyRef),
      tap(() => this.loadAllArticles()),
      catchError((err) => this.generalService.handleHttpError(err))
    );
  }

  editArticle(article: FormData): Observable<FormData> {
    return this.wrapWithLoading(this.articlesService.edit(article)).pipe(
      takeUntilDestroyed(this.destroyRef),
      tap(() => this.loadAllArticles()),
      catchError((err) => this.generalService.handleHttpError(err))
    );
  }

  deleteArticle(id: number): void {
    this.executeWithLoading(this.articlesService.delete(id), () =>
      this.loadAllArticles()
    );
  }

  clearSelectedArticle(): void {
    this.selectedArticleSubject.next(null);
  }

  applyFilterWord(keyword: string): void {
    const all = this.articlesSubject.getValue();

    if (!all) {
      this.filteredArticlesSubject.next(all);
      return;
    }

    if (!toSearchKey(keyword)) {
      this.filteredArticlesSubject.next(all);
      return;
    }

    const filtered = all.filter((p) =>
      [p.title].some((field) => includesNormalized(field, keyword))
    );

    this.filteredArticlesSubject.next(filtered);
  }

  // ---------- Privado / utilidades

  updateArticleState(articles: ArticleModel[]): void {
    this.articlesSubject.next(articles);
    this.filteredArticlesSubject.next(articles);
  }
}
