import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { RecipeModel } from 'src/app/core/interfaces/recipe.interface';
import { GeneralService } from 'src/app/core/services/generalService.service';
import { environments } from 'src/environments/environments';

@Injectable({
  providedIn: 'root',
})
export class RecipesService {
  private readonly generalService = inject(GeneralService);
  private apiUrl: string = `${environments.api}/backend/recipes.php`;
  constructor(private http: HttpClient) {}

  getRecipes(): Observable<any> {
    return this.http
      .get(this.apiUrl)
      .pipe(catchError((err) => this.generalService.handleHttpError(err)));
  }

  getRecipesByCategory(category: string): Observable<any> {
    return this.http
      .get(this.apiUrl, {
        params: { category: category },
      })
      .pipe(catchError((err) => this.generalService.handleHttpError(err)));
  }

  getRecipesByYear(year: number): Observable<any> {
    return this.http
      .get(this.apiUrl, {
        params: { year: year },
      })
      .pipe(catchError((err) => this.generalService.handleHttpError(err)));
  }

  getRecipesByLatest(): Observable<any> {
    return this.http
      .get(this.apiUrl, { params: { latest: true } })
      .pipe(catchError((err) => this.generalService.handleHttpError(err)));
  }

  getRecipeById(id: number): Observable<any> {
    return this.http
      .get(`${this.apiUrl}/${id}`)
      .pipe(catchError((err) => this.generalService.handleHttpError(err)));
  }

  add(recipe: FormData): Observable<any> {
    return this.http
      .post(this.apiUrl, recipe)
      .pipe(catchError((err) => this.generalService.handleHttpError(err)));
  }

  edit(recipe: FormData): Observable<any> {
    return this.http
      .post(this.apiUrl, recipe)
      .pipe(catchError((err) => this.generalService.handleHttpError(err)));
  }

  delete(id: number): Observable<any> {
    return this.generalService.deleteOverride<any>(this.apiUrl, { id });
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
}
