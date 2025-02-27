import { DestroyRef, inject, Injectable } from '@angular/core';
import {
  BehaviorSubject,
  catchError,
  Observable,
  of,
  tap,
  throwError,
} from 'rxjs';
import { RecipesService } from '../core/services/recipes.services';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { RecipeModel } from '../core/interfaces/recipe.interface';
import { HttpErrorResponse } from '@angular/common/http';

@Injectable({
  providedIn: 'root',
})
export class RecipesFacade {
  private destroyRef = inject(DestroyRef);
  private recipesService = inject(RecipesService);
  private recipesSubject = new BehaviorSubject<RecipeModel[] | null>(null);
  private filteredRecipesSubject = new BehaviorSubject<RecipeModel[] | null>(
    null
  );
  private selectedRecipeSubject = new BehaviorSubject<RecipeModel | null>(null);

  recipes$ = this.recipesSubject.asObservable();
  selectedRecipe$ = this.selectedRecipeSubject.asObservable();
  filteredRecipes$ = this.filteredRecipesSubject.asObservable();

  constructor() {}

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

  addRecipe(recipe: RecipeModel): Observable<RecipeModel> {
    return this.recipesService.add(recipe).pipe(
      tap(() => this.loadAllRecipes()),
      catchError(this.handleError)
    );
  }

  editRecipe(itemId: number, recipe: RecipeModel): void {
    this.recipesService
      .edit(itemId, recipe)
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        tap(() => this.loadAllRecipes()),
        catchError(this.handleError)
      )
      .subscribe();
  }

  deleteRecipe(id: number): void {
    this.recipesService
      .delete(id)
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        tap(() => this.loadAllRecipes()),
        catchError(this.handleError)
      )
      .subscribe();
  }

  clearSelectedRecipe(): void {
    this.selectedRecipeSubject.next(null);
  }

  applyFilter(keyword: string): void {
    const searchValue = keyword.toLowerCase();
    const allRecipes = this.recipesSubject.getValue();

    if (!searchValue) {
      this.filteredRecipesSubject.next(allRecipes);
    } else {
      const filteredRecipes = this.recipesSubject
        .getValue()!
        .filter(
          (recipe) =>
            recipe.title.toLowerCase().includes(searchValue) ||
            (recipe.owner && recipe.owner.toLowerCase().includes(searchValue))
        );

      this.filteredRecipesSubject.next(filteredRecipes);
    }
  }
  // Método para subir imágenes
  uploadImage(formData: FormData): Observable<any> {
    return this.recipesService.uploadImage(formData).pipe(
      tap((response) => {
        console.log('Imagen subida correctamente', response);
        // Aquí puedes manejar lo que haga falta después de subir la imagen.
      }),
      catchError((error) => {
        console.error('Error al subir la imagen:', error);
        return of(null); // Retorna null en caso de error
      })
    );
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
