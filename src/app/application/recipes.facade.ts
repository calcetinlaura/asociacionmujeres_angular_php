import { HttpErrorResponse } from '@angular/common/http';
import { DestroyRef, inject, Injectable } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { BehaviorSubject, catchError, Observable, tap, throwError } from 'rxjs';
import { RecipeModel } from 'src/app/core/interfaces/recipe.interface';
import { RecipesService } from 'src/app/core/services/recipes.services';

@Injectable({
  providedIn: 'root',
})
export class RecipesFacade {
  private readonly destroyRef = inject(DestroyRef);
  private readonly recipesService = inject(RecipesService);
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

  currentFilter: string = 'TODOS';

  constructor() {}

  setCurrentFilter(filter: string): void {
    this.currentFilter = filter;
    this.loadRecipesByFilter(filter);
  }

  loadRecipesByFilter(filter: string): void {
    const loaders: Record<string, () => void> = {
      TODOS: () => this.loadAllRecipes(),
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
        catchError(this.handleError)
      )
      .subscribe();
  }

  loadRecipesByLatest(): void {
    this.recipesService
      .getRecipesByLatest()
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        tap((recipes: RecipeModel[]) => this.updateRecipeState(recipes)),
        catchError(this.handleError)
      )
      .subscribe();
  }

  loadRecipesByCategory(gender: string): void {
    this.recipesService
      .getRecipesByCategory(gender)
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        tap((recipes: RecipeModel[]) => this.updateRecipeState(recipes)),
        catchError(this.handleError)
      )
      .subscribe();
  }

  loadRecipesByYear(year: number): void {
    this.recipesService
      .getRecipesByYear(year)
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        tap((recipes: RecipeModel[]) => this.updateRecipeState(recipes)),
        catchError(this.handleError)
      )
      .subscribe();
  }

  loadRecipeById(id: number): void {
    this.recipesService
      .getRecipeById(id)
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        tap((recipe: RecipeModel) => this.selectedRecipeSubject.next(recipe)),
        catchError(this.handleError)
      )
      .subscribe();
  }

  addRecipe(recipe: FormData): Observable<FormData> {
    return this.recipesService.add(recipe).pipe(
      takeUntilDestroyed(this.destroyRef),
      tap(() => this.reloadCurrentFilter()),
      catchError(this.handleError)
    );
  }

  editRecipe(itemId: number, recipe: FormData): Observable<FormData> {
    return this.recipesService.edit(itemId, recipe).pipe(
      takeUntilDestroyed(this.destroyRef),
      tap(() => this.reloadCurrentFilter()),
      catchError(this.handleError)
    );
  }

  deleteRecipe(id: number): void {
    this.recipesService
      .delete(id)
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        tap(() => this.reloadCurrentFilter()),
        catchError(this.handleError)
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

  // Método para manejar errores
  handleError(error: HttpErrorResponse) {
    let errorMessage = '';

    if (error.error instanceof ErrorEvent) {
      // Error del lado del cliente o red
      errorMessage = `Error del cliente o red: ${error.error.message}`;
    } else {
      // El backend retornó un código de error no exitoso
      errorMessage = `Código de error del servidor: ${error.status}\nMensaje: ${error.message}`;
    }

    console.error(errorMessage); // Para depuración

    // Aquí podrías devolver un mensaje amigable para el usuario, o simplemente retornar el error
    return throwError(
      () =>
        new Error(
          'Hubo un problema con la solicitud, inténtelo de nuevo más tarde.'
        )
    );
  }
}
