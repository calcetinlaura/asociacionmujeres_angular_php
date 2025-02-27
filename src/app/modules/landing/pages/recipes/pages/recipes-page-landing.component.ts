import { CommonModule } from '@angular/common';
import {
  Component,
  DestroyRef,
  inject,
  OnInit,
  ViewChild,
} from '@angular/core';
import { FiltersComponent } from '../../../components/filters/filters.component';
import { TypeList, filterRecipes } from 'src/app/core/models/general.model';
import { RecipesService } from 'src/app/core/services/recipes.services';
import { SectionGenericComponent } from '../../../components/section-generic/section-generic.component';
import { tap } from 'rxjs';
import { RecipeModel } from 'src/app/core/interfaces/recipe.interface';
import { InputSearchComponent } from '../../../../../shared/components/inputs/input-search/input-search.component';
import { RecipesFacade } from 'src/app/application';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { NoResultsComponent } from '../../../components/no-results/no-results.component';
import { SpinnerLoadingComponent } from '../../../components/spinner-loading/spinner-loading.component';

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
  providers: [RecipesService],
})
export class RecipesPageLandingComponent implements OnInit {
  private destroyRef = inject(DestroyRef);
  private recipesFacade = inject(RecipesFacade);

  recipes: RecipeModel[] = [];
  filteredRecipes: RecipeModel[] = [];
  isLoading: boolean = true;
  areThereResults: boolean = false;
  filterCategoryRecipes = filterRecipes;
  typeList = TypeList;
  number: number = 0;
  selectedFilter: string = 'TODOS';

  @ViewChild(InputSearchComponent)
  private inputSearchComponent!: InputSearchComponent;

  ngOnInit(): void {
    this.filterSelected('NOVEDADES');
  }

  filterSelected(filter: string): void {
    this.selectedFilter = filter;
    if (this.inputSearchComponent) {
      this.inputSearchComponent.clearInput();
    }
    switch (filter) {
      case 'TODOS':
        this.recipesFacade.loadAllRecipes();
        break;
      case 'NOVEDADES':
        this.recipesFacade.loadRecipesByLatest();
        break;
      default:
        this.recipesFacade.loadRecipesByCategory(filter);
        break;
    }
    this.recipesFacade.recipes$
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        tap((recipes) => this.updateRecipeState(recipes))
      )
      .subscribe();
  }

  applyFilter(keyword: string): void {
    this.recipesFacade.applyFilter(keyword);
    this.recipesFacade.filteredRecipes$
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        tap((recipes) => {
          this.updateRecipeState(recipes);
        })
      )
      .subscribe();
  }

  updateRecipeState(recipes: RecipeModel[] | null): void {
    if (recipes === null) {
      return;
    }
    this.recipes = recipes.sort((a, b) =>
      a.title.toLowerCase().localeCompare(b.title.toLowerCase())
    );
    this.filteredRecipes = [...this.recipes];
    this.number = this.recipes.length;
    this.areThereResults = this.number > 0;
    this.isLoading = false;
  }
}
