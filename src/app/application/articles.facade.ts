import { inject, Injectable } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { BehaviorSubject, Observable } from 'rxjs';
import { catchError, finalize, tap } from 'rxjs/operators';
import { ArticleModel } from 'src/app/core/interfaces/article.interface';
import { ArticlesService } from 'src/app/core/services/articles.services';
import { includesNormalized, toSearchKey } from '../shared/utils/text.utils';
import { LoadableFacade } from './loadable.facade';

@Injectable({ providedIn: 'root' })
export class ArticlesFacade extends LoadableFacade {
  private readonly articlesService = inject(ArticlesService);

  // ─────────────────────────────────────────────
  // State
  // ─────────────────────────────────────────────
  private readonly articlesSubject = new BehaviorSubject<ArticleModel[] | null>(
    null
  );
  private readonly filteredArticlesSubject = new BehaviorSubject<
    ArticleModel[] | null
  >(null);
  private readonly selectedArticleSubject =
    new BehaviorSubject<ArticleModel | null>(null);

  // NEW: loaders separados
  private readonly listLoadingSubject = new BehaviorSubject<boolean>(false);
  private readonly itemLoadingSubject = new BehaviorSubject<boolean>(false);

  // ─────────────────────────────────────────────
  // Public streams
  // ─────────────────────────────────────────────
  readonly articles$ = this.articlesSubject.asObservable();
  readonly filteredArticles$ = this.filteredArticlesSubject.asObservable();
  readonly selectedArticle$ = this.selectedArticleSubject.asObservable();

  // NEW: usa estos en la UI
  readonly isLoadingList$ = this.listLoadingSubject.asObservable();
  readonly isLoadingItem$ = this.itemLoadingSubject.asObservable();

  // ─────────────────────────────────────────────
  // LISTA → isLoadingList$
  // ─────────────────────────────────────────────
  loadAllArticles(): void {
    this.listLoadingSubject.next(true);
    this.articlesService
      .getArticles()
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        catchError((err) => this.generalService.handleHttpError(err)),
        finalize(() => this.listLoadingSubject.next(false))
      )
      .subscribe((articles) => this.updateArticleState(articles));
  }

  // ─────────────────────────────────────────────
  // ITEM → isLoadingItem$
  // ─────────────────────────────────────────────
  loadArticleById(id: number): void {
    this.itemLoadingSubject.next(true);
    this.articlesService
      .getArticleById(id)
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        catchError((err) => this.generalService.handleHttpError(err)),
        finalize(() => this.itemLoadingSubject.next(false))
      )
      .subscribe((article) => this.selectedArticleSubject.next(article));
  }

  addArticle(article: FormData): Observable<FormData> {
    this.itemLoadingSubject.next(true);
    return this.articlesService.add(article).pipe(
      takeUntilDestroyed(this.destroyRef),
      tap(() => this.loadAllArticles()),
      catchError((err) => this.generalService.handleHttpError(err)),
      finalize(() => this.itemLoadingSubject.next(false))
    );
  }

  editArticle(article: FormData): Observable<FormData> {
    this.itemLoadingSubject.next(true);
    return this.articlesService.edit(article).pipe(
      takeUntilDestroyed(this.destroyRef),
      tap(() => this.loadAllArticles()),
      catchError((err) => this.generalService.handleHttpError(err)),
      finalize(() => this.itemLoadingSubject.next(false))
    );
  }

  deleteArticle(id: number): void {
    this.itemLoadingSubject.next(true);
    this.articlesService
      .delete(id)
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        catchError((err) => this.generalService.handleHttpError(err)),
        finalize(() => this.itemLoadingSubject.next(false))
      )
      .subscribe(() => this.loadAllArticles());
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

  // ─────────────────────────────────────────────
  // Privado / utilidades
  // ─────────────────────────────────────────────
  private updateArticleState(articles: ArticleModel[]): void {
    this.articlesSubject.next(articles);
    this.filteredArticlesSubject.next(articles);
  }
}
