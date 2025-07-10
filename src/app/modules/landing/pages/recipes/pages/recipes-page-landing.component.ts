import { CommonModule } from '@angular/common';
import {
  Component,
  DestroyRef,
  inject,
  OnInit,
  ViewChild,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { tap } from 'rxjs';
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
    imports: [
        CommonModule,
        FiltersComponent,
        SectionGenericComponent,
        InputSearchComponent,
        NoResultsComponent,
        SpinnerLoadingComponent,
    ],
    templateUrl: './recipes-page-landing.component.html'
})
export class RecipesPageLandingComponent implements OnInit {
  private readonly destroyRef = inject(DestroyRef);
  private readonly recipesFacade = inject(RecipesFacade);
  private readonly recipesService = inject(RecipesService);
  private readonly generalService = inject(GeneralService);

  recipes: RecipeModel[] = [];
  filteredRecipes: RecipeModel[] = [];
  filters: Filter[] = [];
  isLoading = true;
  areThereResults = false;
  typeList = TypeList;
  number = 0;
  selectedFilter = 'ALL';

  @ViewChild(InputSearchComponent)
  private inputSearchComponent!: InputSearchComponent;

  ngOnInit(): void {
    this.filters = [
      { code: 'NOVEDADES', name: 'Novedades' },
      { code: 'ALL', name: 'Todos' },
      ...categoryFilterRecipes,
    ];

    this.filterSelected('NOVEDADES');

    this.recipesFacade.filteredRecipes$
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        tap((recipes) => this.updateRecipeState(recipes))
      )
      .subscribe();
  }

  filterSelected(filter: string): void {
    this.selectedFilter = filter;
    this.generalService.clearSearchInput(this.inputSearchComponent);
    this.recipesFacade.setCurrentFilter(filter);
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
    this.isLoading = false;
  }
}
