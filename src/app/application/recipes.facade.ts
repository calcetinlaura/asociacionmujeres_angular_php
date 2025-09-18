import { inject, Injectable } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { BehaviorSubject, catchError, Observable, tap } from 'rxjs';
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

  // State propio
  private readonly recipesSubject = new BehaviorSubject<RecipeModel[] | null>(
    null
  );
  private readonly filteredRecipesSubject = new BehaviorSubject<
    RecipeModel[] | null
  >(null);
  private readonly selectedRecipeSubject =
    new BehaviorSubject<RecipeModel | null>(null);

  // Streams públicos
  readonly recipes$ = this.recipesSubject.asObservable();
  readonly filteredRecipes$ = this.filteredRecipesSubject.asObservable();
  readonly selectedRecipe$ = this.selectedRecipeSubject.asObservable();

  // Último filtro aplicado (para recargar)
  private currentFilter: string | null = null;

  // ---------- API pública

  loadAllRecipes(): void {
    this.setCurrentFilter(null);
    this.executeWithLoading(this.recipesService.getRecipes(), (recipes) =>
      this.updateRecipeState(recipes)
    );
  }

  loadRecipesByFilter(filter: string): void {
    this.setCurrentFilter(filter);

    const loaders: Record<string, () => void> = {
      [RecipesFilter.NOVEDADES]: () => this.loadRecipesByLatest(),
    };

    (loaders[filter] ?? (() => this.loadRecipesByCategory(filter)))();
  }

  loadRecipesByLatest(): void {
    this.executeWithLoading(
      this.recipesService.getRecipesByLatest(),
      (recipes) => this.updateRecipeState(recipes)
    );
  }

  loadRecipesByCategory(category: string): void {
    this.executeWithLoading(
      this.recipesService.getRecipesByCategory(category),
      (recipes) => this.updateRecipeState(recipes)
    );
  }

  loadRecipesByYear(year: number): void {
    this.executeWithLoading(
      this.recipesService.getRecipesByYear(year),
      (recipes) => this.updateRecipeState(recipes)
    );
  }

  loadRecipeById(id: number): void {
    this.executeWithLoading(this.recipesService.getRecipeById(id), (recipe) =>
      this.selectedRecipeSubject.next(recipe)
    );
  }

  addRecipe(recipe: FormData): Observable<FormData> {
    return this.wrapWithLoading(this.recipesService.add(recipe)).pipe(
      takeUntilDestroyed(this.destroyRef),
      tap(() => this.reloadCurrentFilter()),
      catchError((err) => this.generalService.handleHttpError(err))
    );
  }

  editRecipe(recipe: FormData): Observable<FormData> {
    return this.wrapWithLoading(this.recipesService.edit(recipe)).pipe(
      takeUntilDestroyed(this.destroyRef),
      tap(() => this.reloadCurrentFilter()),
      catchError((err) => this.generalService.handleHttpError(err))
    );
  }

  deleteRecipe(id: number): void {
    this.executeWithLoading(this.recipesService.delete(id), () =>
      this.reloadCurrentFilter()
    );
  }

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

  // ---------- Privado / utilidades

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
