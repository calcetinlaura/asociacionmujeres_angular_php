import { DestroyRef, inject, Injectable } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { BehaviorSubject, catchError, Observable, tap } from 'rxjs';
import { RecipeModel } from 'src/app/core/interfaces/recipe.interface';
import { RecipesService } from 'src/app/core/services/recipes.services';
import { GeneralService } from '../shared/services/generalService.service';

@Injectable({
  providedIn: 'root',
})
export class RecipesFacade {
  private readonly destroyRef = inject(DestroyRef);
  private readonly recipesService = inject(RecipesService);
  private readonly generalService = inject(GeneralService);
  private readonly recipesSubject = new BehaviorSubject<RecipeModel[] | null>(
    null
  );
  private readonly filteredRecipesSubject = new BehaviorSubject<
    RecipeModel[] | null
  >(null);
  private readonly selectedRecipeSubject =
    new BehaviorSubject<RecipeModel | null>(null);

  recipes$ = this.recipesSubject.asObservable();
  selectedRecipe$ = this.selectedRecipeSubject.asObservable();
  filteredRecipes$ = this.filteredRecipesSubject.asObservable();

  currentFilter: string = 'ALL';

  constructor() {}

  setCurrentFilter(filter: string): void {
    this.currentFilter = filter;
    this.loadRecipesByFilter(filter);
  }

  loadRecipesByFilter(filter: string): void {
    const loaders: Record<string, () => void> = {
      ALL: () => this.loadAllRecipes(),
      NOVEDADES: () => this.loadRecipesByLatest(),
    };

    (loaders[filter] || (() => this.loadRecipesByCategory(filter)))();
  }

  private reloadCurrentFilter(): void {
    this.loadRecipesByFilter(this.currentFilter);
  }

  loadAllRecipes(): void {
    this.recipesService
      .getRecipes()
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        tap((recipes: RecipeModel[]) => this.updateRecipeState(recipes)),
        catchError((err) => this.generalService.handleHttpError(err))
      )
      .subscribe();
  }

  loadRecipesByLatest(): void {
    this.recipesService
      .getRecipesByLatest()
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        tap((recipes: RecipeModel[]) => this.updateRecipeState(recipes)),
        catchError((err) => this.generalService.handleHttpError(err))
      )
      .subscribe();
  }

  loadRecipesByCategory(gender: string): void {
    this.recipesService
      .getRecipesByCategory(gender)
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        tap((recipes: RecipeModel[]) => this.updateRecipeState(recipes)),
        catchError((err) => this.generalService.handleHttpError(err))
      )
      .subscribe();
  }

  loadRecipesByYear(year: number): void {
    this.recipesService
      .getRecipesByYear(year)
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        tap((recipes: RecipeModel[]) => this.updateRecipeState(recipes)),
        catchError((err) => this.generalService.handleHttpError(err))
      )
      .subscribe();
  }

  loadRecipeById(id: number): void {
    this.recipesService
      .getRecipeById(id)
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        tap((recipe: RecipeModel) => this.selectedRecipeSubject.next(recipe)),
        catchError((err) => this.generalService.handleHttpError(err))
      )
      .subscribe();
  }

  addRecipe(recipe: FormData): Observable<FormData> {
    return this.recipesService.add(recipe).pipe(
      takeUntilDestroyed(this.destroyRef),
      tap(() => this.reloadCurrentFilter()),
      catchError((err) => this.generalService.handleHttpError(err))
    );
  }

  editRecipe(itemId: number, recipe: FormData): Observable<FormData> {
    return this.recipesService.edit(itemId, recipe).pipe(
      takeUntilDestroyed(this.destroyRef),
      tap(() => this.reloadCurrentFilter()),
      catchError((err) => this.generalService.handleHttpError(err))
    );
  }

  deleteRecipe(id: number): void {
    this.recipesService
      .delete(id)
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        tap(() => this.reloadCurrentFilter()),
        catchError((err) => this.generalService.handleHttpError(err))
      )
      .subscribe();
  }

  clearSelectedRecipe(): void {
    this.selectedRecipeSubject.next(null);
  }

  applyFilterWord(keyword: string): void {
    const allRecipes = this.recipesSubject.getValue();

    if (!keyword.trim() || !allRecipes) {
      this.filteredRecipesSubject.next(allRecipes);
      return;
    }
    const search = keyword.trim().toLowerCase();
    const filteredRecipes = allRecipes.filter(
      (recipe) =>
        recipe.title.toLowerCase().includes(search) ||
        (recipe.owner && recipe.owner.toLowerCase().includes(search))
    );

    this.filteredRecipesSubject.next(filteredRecipes);
  }

  updateRecipeState(recipes: RecipeModel[]): void {
    this.recipesSubject.next(recipes);
    this.filteredRecipesSubject.next(recipes);
  }
}
