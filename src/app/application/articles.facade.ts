import { inject, Injectable } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { BehaviorSubject, EMPTY, Observable } from 'rxjs';
import { catchError, finalize, tap } from 'rxjs/operators';
import { ArticleModel } from 'src/app/core/interfaces/article.interface';
import { ArticlesService } from 'src/app/core/services/articles.services';
import { includesNormalized, toSearchKey } from '../shared/utils/text.utils';
import { LoadableFacade } from './loadable.facade';

@Injectable({ providedIn: 'root' })
export class ArticlesFacade extends LoadableFacade {
  private readonly articlesService = inject(ArticlesService);

  // ───────── STATE ─────────
  private readonly articlesSubject = new BehaviorSubject<ArticleModel[] | null>(
    null
  );
  private readonly filteredArticlesSubject = new BehaviorSubject<
    ArticleModel[] | null
  >(null);
  private readonly selectedArticleSubject =
    new BehaviorSubject<ArticleModel | null>(null);

  private readonly listLoadingSubject = new BehaviorSubject<boolean>(false);
  private readonly itemLoadingSubject = new BehaviorSubject<boolean>(false);

  // ───────── PUBLIC STREAMS ─────────
  readonly articles$ = this.articlesSubject.asObservable();
  readonly filteredArticles$ = this.filteredArticlesSubject.asObservable();
  readonly selectedArticle$ = this.selectedArticleSubject.asObservable();
  readonly isLoadingList$ = this.listLoadingSubject.asObservable();
  readonly isLoadingItem$ = this.itemLoadingSubject.asObservable();

  // ───────── LISTA → isLoadingList$ ─────────
  loadAllArticles(): void {
    this.listLoadingSubject.next(true);

    this.articlesService
      .getArticles()
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        tap((articles) => this.updateArticleState(articles)),
        catchError((err) => {
          this.generalService.handleHttpError(err);
          return EMPTY;
        }),
        finalize(() => this.listLoadingSubject.next(false))
      )
      .subscribe();
  }

  // ───────── ITEM → isLoadingItem$ ─────────
  loadArticleById(id: number): void {
    this.itemLoadingSubject.next(true);

    this.articlesService
      .getArticleById(id)
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        tap((article) => this.selectedArticleSubject.next(article)),
        catchError((err) => {
          this.generalService.handleHttpError(err);
          return EMPTY;
        }),
        finalize(() => this.itemLoadingSubject.next(false))
      )
      .subscribe();
  }

  // ───────── CRUD ─────────
  addArticle(article: FormData): Observable<FormData> {
    this.itemLoadingSubject.next(true);

    return this.articlesService.add(article).pipe(
      takeUntilDestroyed(this.destroyRef),
      tap(() => this.loadAllArticles()),
      catchError((err) => {
        this.generalService.handleHttpError(err);
        return EMPTY;
      }),
      finalize(() => this.itemLoadingSubject.next(false))
    );
  }

  editArticle(article: FormData): Observable<FormData> {
    this.itemLoadingSubject.next(true);

    return this.articlesService.edit(article).pipe(
      takeUntilDestroyed(this.destroyRef),
      tap(() => this.loadAllArticles()),
      catchError((err) => {
        this.generalService.handleHttpError(err);
        return EMPTY;
      }),
      finalize(() => this.itemLoadingSubject.next(false))
    );
  }

  deleteArticle(id: number): void {
    this.itemLoadingSubject.next(true);

    this.articlesService
      .delete(id)
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        tap(() => this.loadAllArticles()),
        catchError((err) => {
          this.generalService.handleHttpError(err);
          return EMPTY;
        }),
        finalize(() => this.itemLoadingSubject.next(false))
      )
      .subscribe();
  }

  // ───────── HELPERS ─────────
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

  // ───────── PRIVADO / UTILIDADES ─────────
  private updateArticleState(articles: ArticleModel[]): void {
    this.articlesSubject.next(articles);
    this.filteredArticlesSubject.next(articles);
  }
}
