import { CommonModule } from '@angular/common';
import {
  Component,
  DestroyRef,
  inject,
  OnInit,
  ViewChild,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormGroup, ReactiveFormsModule } from '@angular/forms';
import { tap } from 'rxjs';
import { RecipesFacade } from 'src/app/application/recipes.facade';
import { ColumnModel } from 'src/app/core/interfaces/column.interface';
import {
  categoryFilterRecipes,
  RecipeModel,
} from 'src/app/core/interfaces/recipe.interface';
import {
  Filter,
  TypeActionModal,
  TypeList,
} from 'src/app/core/models/general.model';
import { RecipesService } from 'src/app/core/services/recipes.services';
import { DashboardHeaderComponent } from 'src/app/modules/dashboard/components/dashboard-header/dashboard-header.component';
import { TableComponent } from 'src/app/modules/dashboard/components/table/table.component';
import { FiltersComponent } from 'src/app/modules/landing/components/filters/filters.component';
import { AddButtonComponent } from 'src/app/shared/components/buttons/button-add/button-add.component';
import { InputSearchComponent } from 'src/app/shared/components/inputs/input-search/input-search.component';
import { ModalComponent } from 'src/app/shared/components/modal/modal.component';
import { ModalService } from 'src/app/shared/components/modal/services/modal.service';
import { SpinnerLoadingComponent } from 'src/app/shared/components/spinner-loading/spinner-loading.component';
import { GeneralService } from 'src/app/shared/services/generalService.service';

@Component({
  selector: 'app-recipes-page',
  standalone: true,
  imports: [
    CommonModule,
    DashboardHeaderComponent,
    ModalComponent,
    AddButtonComponent,
    ReactiveFormsModule,
    InputSearchComponent,
    FiltersComponent,
    SpinnerLoadingComponent,
    TableComponent,
  ],
  templateUrl: './recipes-page.component.html',
  styleUrl: './recipes-page.component.css',
})
export class RecipesPageComponent implements OnInit {
  private readonly destroyRef = inject(DestroyRef);
  private readonly modalService = inject(ModalService);
  private readonly recipesFacade = inject(RecipesFacade);
  private readonly recipesService = inject(RecipesService);
  private readonly generalService = inject(GeneralService);

  recipes: RecipeModel[] = [];
  filteredRecipes: RecipeModel[] = [];
  filters: Filter[] = [];
  selectedFilter = 'TODOS';

  isLoading = true;
  isModalVisible = false;
  number = 0;

  item: RecipeModel | null = null;
  currentModalAction: TypeActionModal = TypeActionModal.Create;
  searchForm!: FormGroup;
  typeList = TypeList.Recipes;

  headerListRecipes: ColumnModel[] = [
    { title: 'Portada', key: 'img' },
    { title: 'Titulo', key: 'title' },
    { title: 'Categoria', key: 'category' },
    { title: 'Autor/a', key: 'owner' },
    { title: 'Ingredientes', key: 'ingredients' },
    { title: 'Receta', key: 'recipe' },
    { title: 'Año', key: 'year' },
  ];

  @ViewChild(InputSearchComponent)
  private inputSearchComponent!: InputSearchComponent;

  ngOnInit(): void {
    this.filters = [
      { code: 'NOVEDADES', name: 'Novedades' },
      { code: 'TODOS', name: 'Todos' },
      ...categoryFilterRecipes,
    ];

    this.modalService.modalVisibility$
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        tap((isVisible) => (this.isModalVisible = isVisible))
      )
      .subscribe();

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
    this.recipesFacade.setCurrentFilter(filter); // usa facade
  }

  applyFilterWord(keyword: string): void {
    this.recipesFacade.applyFilterWord(keyword);
  }

  addNewRecipeModal(): void {
    this.openModal(TypeActionModal.Create, null);
  }

  onOpenModal(event: { action: TypeActionModal; item: RecipeModel }): void {
    this.openModal(event.action, event.item ?? null);
  }

  private openModal(action: TypeActionModal, recipe: RecipeModel | null): void {
    this.currentModalAction = action;
    this.item = recipe;
    this.modalService.openModal();
  }

  onCloseModal(): void {
    this.modalService.closeModal();
  }

  confirmDeleteRecipe(recipe: RecipeModel | null): void {
    if (!recipe) return;
    this.recipesFacade.deleteRecipe(recipe.id);
    this.onCloseModal();
  }

  sendFormRecipe(event: { itemId: number; newRecipeData: FormData }): void {
    const save$ = event.itemId
      ? this.recipesFacade.editRecipe(event.itemId, event.newRecipeData)
      : this.recipesFacade.addRecipe(event.newRecipeData);

    save$
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        tap(() => this.onCloseModal())
      )
      .subscribe();
  }

  private updateRecipeState(recipes: RecipeModel[] | null): void {
    if (!recipes) return;

    this.recipes = this.recipesService.sortRecipesById(recipes);
    this.filteredRecipes = [...this.recipes];
    this.number = this.recipesService.countRecipes(recipes);
    this.isLoading = false;
  }
}
