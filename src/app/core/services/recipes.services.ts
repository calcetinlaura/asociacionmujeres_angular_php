import { Injectable } from '@angular/core';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { catchError } from 'rxjs/operators';
import { Observable, throwError } from 'rxjs';
import { environments } from 'src/environments/environments';
import { RecipeModel } from 'src/app/core/interfaces/recipe.interface';

@Injectable({
  providedIn: 'root',
})
export class RecipesService {
  private apiUrl: string = `${environments.api}/backend/recipes.php`;
  constructor(private http: HttpClient) {}

  getRecipes(): Observable<any> {
    return this.http.get(this.apiUrl).pipe(catchError(this.handleError));
  }

  getRecipesByCategory(category: string): Observable<any> {
    return this.http
      .get(this.apiUrl, {
        params: { category: category },
      })
      .pipe(catchError(this.handleError));
  }

  getRecipesByYear(year: number): Observable<any> {
    return this.http
      .get(this.apiUrl, {
        params: { year: year },
      })
      .pipe(catchError(this.handleError));
  }

  getRecipesByLatest(): Observable<any> {
    return this.http
      .get(this.apiUrl, { params: { latest: true } })
      .pipe(catchError(this.handleError));
  }

  getRecipeById(id: number): Observable<any> {
    return this.http
      .get(`${this.apiUrl}/${id}`)
      .pipe(catchError(this.handleError));
  }

  add(recipe: FormData): Observable<any> {
    return this.http
      .post(this.apiUrl, recipe)
      .pipe(catchError(this.handleError));
  }

  edit(id: number, recipe: FormData): Observable<any> {
    return this.http
      .post(this.apiUrl, recipe)
      .pipe(catchError(this.handleError));
  }

  delete(id: number): Observable<any> {
    return this.http
      .delete(this.apiUrl, { params: { id: id } })
      .pipe(catchError(this.handleError));
  }

  sortRecipesByTitle(recipes: RecipeModel[]): RecipeModel[] {
    return recipes.sort((a, b) =>
      a.title.toLowerCase().localeCompare(b.title.toLowerCase())
    );
  }

  sortRecipesById(recipes: RecipeModel[]): RecipeModel[] {
    return recipes.sort((a, b) => b.id - a.id);
  }

  hasResults(recipes: RecipeModel[] | null): boolean {
    return !!recipes && recipes.length > 0;
  }

  countRecipes(recipes: RecipeModel[] | null): number {
    return recipes?.length ?? 0;
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
