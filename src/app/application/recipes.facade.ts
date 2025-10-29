import { inject, Injectable } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { BehaviorSubject, catchError, finalize, Observable, tap } from 'rxjs';
import { RecipeModel } from 'src/app/core/interfaces/recipe.interface';
import { RecipesService } from 'src/app/core/services/recipes.services';
import { includesNormalized, toSearchKey } from '../shared/utils/text.utils';
import { LoadableFacade } from './loadable.facade';

export enum RecipesFilter {
  NOVEDADES = 'NOVEDADES',
}

@Injectable({ providedIn: 'root' })
export class RecipesFacade extends LoadableFacade {
  private readonly recipesService = inject(RecipesService);

  // Estado
  private readonly recipesSubject = new BehaviorSubject<RecipeModel[] | null>(
    null
  );
  private readonly filteredRecipesSubject = new BehaviorSubject<
    RecipeModel[] | null
  >(null);
  private readonly selectedRecipeSubject =
    new BehaviorSubject<RecipeModel | null>(null);

  // NEW: loaders separados
  private readonly listLoadingSubject = new BehaviorSubject<boolean>(false);
  private readonly itemLoadingSubject = new BehaviorSubject<boolean>(false);

  // Streams públicos
  readonly recipes$ = this.recipesSubject.asObservable();
  readonly filteredRecipes$ = this.filteredRecipesSubject.asObservable();
  readonly selectedRecipe$ = this.selectedRecipeSubject.asObservable();

  // NEW: usa estos en la UI
  readonly isLoadingList$ = this.listLoadingSubject.asObservable();
  readonly isLoadingItem$ = this.itemLoadingSubject.asObservable();

  // Último filtro aplicado (para recargar)
  private currentFilter: string | null = null;

  // ───────────────────── LISTA (isLoadingList$)
  loadAllRecipes(): void {
    console.log('[RecipesFacade] loadAllRecipes called');
    this.setCurrentFilter(null);
    this.listLoadingSubject.next(true);
    this.recipesService
      .getRecipes()
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        catchError((err) => this.generalService.handleHttpError(err)),
        finalize(() => this.listLoadingSubject.next(false))
      )
      .subscribe((recipes) => this.updateRecipeState(recipes));
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
        catchError((err) => this.generalService.handleHttpError(err)),
        finalize(() => this.listLoadingSubject.next(false))
      )
      .subscribe((recipes) => this.updateRecipeState(recipes));
  }

  loadRecipesByCategory(category: string): void {
    this.listLoadingSubject.next(true);
    this.recipesService
      .getRecipesByCategory(category)
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        catchError((err) => this.generalService.handleHttpError(err)),
        finalize(() => this.listLoadingSubject.next(false))
      )
      .subscribe((recipes) => this.updateRecipeState(recipes));
  }

  loadRecipesByYear(year: number): void {
    this.listLoadingSubject.next(true);
    this.recipesService
      .getRecipesByYear(year)
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        catchError((err) => this.generalService.handleHttpError(err)),
        finalize(() => this.listLoadingSubject.next(false))
      )
      .subscribe((recipes) => this.updateRecipeState(recipes));
  }

  // ───────────────────── ITEM (isLoadingItem$)
  loadRecipeById(id: number): void {
    this.itemLoadingSubject.next(true);
    this.recipesService
      .getRecipeById(id)
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        catchError((err) => this.generalService.handleHttpError(err)),
        finalize(() => this.itemLoadingSubject.next(false))
      )
      .subscribe((recipe) => this.selectedRecipeSubject.next(recipe));
  }

  addRecipe(recipe: FormData): Observable<FormData> {
    this.itemLoadingSubject.next(true);
    return this.recipesService.add(recipe).pipe(
      takeUntilDestroyed(this.destroyRef),
      tap(() => this.reloadCurrentFilter()),
      catchError((err) => this.generalService.handleHttpError(err)),
      finalize(() => this.itemLoadingSubject.next(false))
    );
  }

  editRecipe(recipe: FormData): Observable<FormData> {
    this.itemLoadingSubject.next(true);
    return this.recipesService.edit(recipe).pipe(
      takeUntilDestroyed(this.destroyRef),
      tap(() => this.reloadCurrentFilter()),
      catchError((err) => this.generalService.handleHttpError(err)),
      finalize(() => this.itemLoadingSubject.next(false))
    );
  }

  deleteRecipe(id: number): void {
    this.itemLoadingSubject.next(true);
    this.recipesService
      .delete(id)
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        catchError((err) => this.generalService.handleHttpError(err)),
        finalize(() => this.itemLoadingSubject.next(false))
      )
      .subscribe(() => this.reloadCurrentFilter());
  }

  // ───────────────────── Utilidades
  clearSelectedRecipe(): void {
    this.selectedRecipeSubject.next(null);
  }

  applyFilterWord(keyword: string): void {
    const all = this.recipesSubject.getValue();
    if (!all) {
      this.filteredRecipesSubject.next(all);
      return;
    }
    if (!toSearchKey(keyword)) {
      this.filteredRecipesSubject.next(all);
      return;
    }

    const filtered = all.filter((r) =>
      [r.title, r.owner].some((field) => includesNormalized(field, keyword))
    );
    this.filteredRecipesSubject.next(filtered);
  }

  setCurrentFilter(filter: string | null): void {
    this.currentFilter = filter;
  }

  private reloadCurrentFilter(): void {
    if (this.currentFilter === null) {
      this.loadAllRecipes();
      return;
    }
    this.loadRecipesByFilter(this.currentFilter);
  }

  private updateRecipeState(recipes: RecipeModel[]): void {
    this.recipesSubject.next(recipes);
    this.filteredRecipesSubject.next(recipes);
  }
}
