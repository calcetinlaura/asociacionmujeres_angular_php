import { CommonModule } from '@angular/common';
import {
  Component,
  DestroyRef,
  ElementRef,
  inject,
  OnInit,
  ViewChild,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ActivatedRoute } from '@angular/router';
import { take, tap } from 'rxjs';
import { RecipesFacade } from 'src/app/application/recipes.facade';
import {
  categoryFilterRecipes,
  RecipeModel,
} from 'src/app/core/interfaces/recipe.interface';
import { Filter, TypeList } from 'src/app/core/models/general.model';
import { RecipesService } from 'src/app/core/services/recipes.services';
import { FiltersComponent } from 'src/app/modules/landing/components/filters/filters.component';
import { NoResultsComponent } from 'src/app/modules/landing/components/no-results/no-results.component';
import { SectionGenericComponent } from 'src/app/modules/landing/components/section-generic/section-generic.component';
import { InputSearchComponent } from 'src/app/shared/components/inputs/input-search/input-search.component';
import { SpinnerLoadingComponent } from 'src/app/shared/components/spinner-loading/spinner-loading.component';
import { GeneralService } from 'src/app/shared/services/generalService.service';

@Component({
  selector: 'app-recipes-page-landing',
  standalone: true,
  imports: [
    CommonModule,
    FiltersComponent,
    SectionGenericComponent,
    InputSearchComponent,
    NoResultsComponent,
    SpinnerLoadingComponent,
  ],
  templateUrl: './recipes-page-landing.component.html',
})
export class RecipesPageLandingComponent implements OnInit {
  private readonly destroyRef = inject(DestroyRef);
  private readonly route = inject(ActivatedRoute);

  readonly recipesFacade = inject(RecipesFacade);
  private readonly recipesService = inject(RecipesService);
  private readonly generalService = inject(GeneralService);

  recipes: RecipeModel[] = [];
  filteredRecipes: RecipeModel[] = [];
  filters: Filter[] = [];
  areThereResults = false;
  typeList = TypeList;
  number = 0;
  selectedFilter = '';

  @ViewChild(InputSearchComponent)
  private inputSearchComponent!: InputSearchComponent;

  @ViewChild('printArea', { static: false })
  printArea!: ElementRef<HTMLElement>;

  ngOnInit(): void {
    // 1) Filtros: "Todas" + categorías
    this.filters = [{ code: '', name: 'Todas' }, ...categoryFilterRecipes];

    // 2) Si vienes por /recipes/:id -> deduce categoría; si no, carga por defecto
    const initialId = this.route.snapshot.paramMap.get('id');
    if (initialId) {
      this.handleDeepLinkById(Number(initialId));
    } else {
      this.filterSelected('');
    }

    // 3) Pintar cuando cambie el listado filtrado
    this.recipesFacade.filteredRecipes$
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        tap((recipes) => this.updateRecipeState(recipes))
      )
      .subscribe();
  }

  private handleDeepLinkById(id: number): void {
    if (!Number.isFinite(id)) {
      this.filterSelected('');
      return;
    }

    // Carga la receta -> lee category (code) -> aplica filtro por categoría
    // (usamos el service directo; si tu facade tiene loadRecipeById/selectedRecipe$, puedes replicar ese patrón)
    this.recipesService
      .getRecipeById(id)
      .pipe(takeUntilDestroyed(this.destroyRef), take(1))
      .subscribe({
        next: (recipe) => {
          const catCode = this.pickCategoryFilterCode(recipe);
          if (catCode) {
            this.selectedFilter = catCode; // marca botón
            this.recipesFacade.loadRecipesByFilter(catCode); // filtra por categoría
          } else {
            this.filterSelected(''); // fallback: Todas
          }
        },
        error: () => this.filterSelected(''),
      });
  }

  // === Filtros ===
  filterSelected(filter: string): void {
    this.selectedFilter = filter;
    this.generalService.clearSearchInput?.(this.inputSearchComponent);

    if (filter === '') {
      this.recipesFacade.loadAllRecipes();
    } else {
      this.recipesFacade.loadRecipesByFilter(filter);
    }
  }

  applyFilterWord(keyword: string): void {
    this.recipesFacade.applyFilterWord(keyword);
  }

  updateRecipeState(recipes: RecipeModel[] | null): void {
    if (!recipes) return;
    this.recipes = this.recipesService.sortRecipesByTitle(recipes);
    this.filteredRecipes = [...this.recipes];
    this.number = this.recipesService.countRecipes(recipes);
    this.areThereResults = this.recipesService.hasResults(recipes);
  }

  // === Helpers ===
  // Si tu BBDD guarda el code de categoría en `category`, basta con devolverlo.
  private pickCategoryFilterCode(r: RecipeModel): string | null {
    const code = (r as any)?.category; // p.ej. "POSTRES", "ENTRANTES", etc.
    return code ? String(code) : null;
  }
}
