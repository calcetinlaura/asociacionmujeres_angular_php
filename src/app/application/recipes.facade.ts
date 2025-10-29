import { inject, Injectable } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { BehaviorSubject, EMPTY, Observable } from 'rxjs';
import { catchError, finalize, tap } from 'rxjs/operators';
import { RecipeModel } from 'src/app/core/interfaces/recipe.interface';
import { RecipesService } from 'src/app/core/services/recipes.services';
import {
  count,
  filterByKeyword,
  hasResults,
} from '../shared/utils/facade.utils';
import { LoadableFacade } from './loadable.facade';

export enum RecipesFilter {
  NOVEDADES = 'NOVEDADES',
}

@Injectable({ providedIn: 'root' })
export class RecipesFacade extends LoadableFacade {
  private readonly recipesService = inject(RecipesService);

  // ───────── STATE ─────────
  private readonly recipesSubject = new BehaviorSubject<RecipeModel[] | null>(
    null
  );
  private readonly filteredRecipesSubject = new BehaviorSubject<
    RecipeModel[] | null
  >(null);
  private readonly selectedRecipeSubject =
    new BehaviorSubject<RecipeModel | null>(null);

  private readonly listLoadingSubject = new BehaviorSubject<boolean>(false);
  private readonly itemLoadingSubject = new BehaviorSubject<boolean>(false);

  // ───────── PUBLIC STREAMS ─────────
  readonly recipes$ = this.recipesSubject.asObservable();
  readonly filteredRecipes$ = this.filteredRecipesSubject.asObservable();
  readonly selectedRecipe$ = this.selectedRecipeSubject.asObservable();
  readonly isLoadingList$ = this.listLoadingSubject.asObservable();
  readonly isLoadingItem$ = this.itemLoadingSubject.asObservable();

  private currentFilter: string | null = null;

  // ───────── LISTA → isLoadingList$ ─────────
  loadAllRecipes(): void {
    this.setCurrentFilter(null);
    this.listLoadingSubject.next(true);

    this.recipesService
      .getRecipes()
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        tap((recipes) => this.updateRecipeState(recipes)),
        catchError((err) => {
          this.generalService.handleHttpError(err);
          return EMPTY;
        }),
        finalize(() => this.listLoadingSubject.next(false))
      )
      .subscribe();
  }

  loadRecipesByFilter(filter: string): void {
    this.setCurrentFilter(filter);
    const loaders: Record<string, () => void> = {
      [RecipesFilter.NOVEDADES]: () => this.loadRecipesByLatest(),
    };
    (loaders[filter] ?? (() => this.loadRecipesByCategory(filter)))();
  }

  loadRecipesByLatest(): void {
    this.listLoadingSubject.next(true);

    this.recipesService
      .getRecipesByLatest()
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        tap((recipes) => this.updateRecipeState(recipes)),
        catchError((err) => {
          this.generalService.handleHttpError(err);
          return EMPTY;
        }),
        finalize(() => this.listLoadingSubject.next(false))
      )
      .subscribe();
  }

  loadRecipesByCategory(category: string): void {
    this.listLoadingSubject.next(true);

    this.recipesService
      .getRecipesByCategory(category)
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        tap((recipes) => this.updateRecipeState(recipes)),
        catchError((err) => {
          this.generalService.handleHttpError(err);
          return EMPTY;
        }),
        finalize(() => this.listLoadingSubject.next(false))
      )
      .subscribe();
  }

  loadRecipesByYear(year: number): void {
    this.listLoadingSubject.next(true);

    this.recipesService
      .getRecipesByYear(year)
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        tap((recipes) => this.updateRecipeState(recipes)),
        catchError((err) => {
          this.generalService.handleHttpError(err);
          return EMPTY;
        }),
        finalize(() => this.listLoadingSubject.next(false))
      )
      .subscribe();
  }

  // ───────── ITEM → isLoadingItem$ ─────────
  loadRecipeById(id: number): void {
    this.itemLoadingSubject.next(true);

    this.recipesService
      .getRecipeById(id)
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        tap((recipe) => this.selectedRecipeSubject.next(recipe)),
        catchError((err) => {
          this.generalService.handleHttpError(err);
          return EMPTY;
        }),
        finalize(() => this.itemLoadingSubject.next(false))
      )
      .subscribe();
  }

  // ───────── CRUD ─────────
  addRecipe(recipe: FormData): Observable<FormData> {
    this.itemLoadingSubject.next(true);

    return this.recipesService.add(recipe).pipe(
      takeUntilDestroyed(this.destroyRef),
      tap(() => this.reloadCurrentFilter()),
      catchError((err) => {
        this.generalService.handleHttpError(err);
        return EMPTY;
      }),
      finalize(() => this.itemLoadingSubject.next(false))
    );
  }

  editRecipe(recipe: FormData): Observable<FormData> {
    this.itemLoadingSubject.next(true);

    return this.recipesService.edit(recipe).pipe(
      takeUntilDestroyed(this.destroyRef),
      tap(() => this.reloadCurrentFilter()),
      catchError((err) => {
        this.generalService.handleHttpError(err);
        return EMPTY;
      }),
      finalize(() => this.itemLoadingSubject.next(false))
    );
  }

  deleteRecipe(id: number): void {
    this.itemLoadingSubject.next(true);

    this.recipesService
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
  clearSelectedRecipe(): void {
    this.selectedRecipeSubject.next(null);
  }

  applyFilterWord(keyword: string): void {
    const all = this.recipesSubject.getValue();
    this.filteredRecipesSubject.next(
      filterByKeyword(all, keyword, [(b) => b.title, (b) => b.owner])
    );
  }

  setCurrentFilter(filter: string | null): void {
    this.currentFilter = filter;
  }

  private reloadCurrentFilter(): void {
    if (this.currentFilter === null) {
      this.loadAllRecipes();
    } else {
      this.loadRecipesByFilter(this.currentFilter);
    }
  }

  private updateRecipeState(recipes: RecipeModel[]): void {
    this.recipesSubject.next(recipes);
    this.filteredRecipesSubject.next(recipes);
  }
  get totalRecipes(): number {
    return count(this.recipesSubject.getValue());
  }

  get hasRecipes(): boolean {
    return hasResults(this.recipesSubject.getValue());
  }
}
