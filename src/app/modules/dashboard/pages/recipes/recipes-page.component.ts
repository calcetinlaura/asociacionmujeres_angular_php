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
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatMenuModule } from '@angular/material/menu';
import { tap } from 'rxjs';
import { RecipesFacade } from 'src/app/application/recipes.facade';
import {
  ColumnModel,
  ColumnWidth,
} from 'src/app/core/interfaces/column.interface';
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
import { ButtonIconComponent } from 'src/app/shared/components/buttons/button-icon/button-icon.component';
import { ButtonComponent } from 'src/app/shared/components/buttons/button/button.component';
import { IconActionComponent } from 'src/app/shared/components/buttons/icon-action/icon-action.component';
import { InputSearchComponent } from 'src/app/shared/components/inputs/input-search/input-search.component';
import { ModalComponent } from 'src/app/shared/components/modal/modal.component';
import { ModalService } from 'src/app/shared/components/modal/services/modal.service';
import { SpinnerLoadingComponent } from 'src/app/shared/components/spinner-loading/spinner-loading.component';
import { GeneralService } from 'src/app/shared/services/generalService.service';
import { PdfPrintService } from 'src/app/shared/services/PdfPrintService.service';
import { StickyZoneComponent } from '../../components/sticky-zone/sticky-zone.component';

@Component({
  selector: 'app-recipes-page',
  imports: [
    DashboardHeaderComponent,
    ModalComponent,
    ButtonIconComponent,
    ReactiveFormsModule,
    InputSearchComponent,
    FiltersComponent,
    SpinnerLoadingComponent,
    TableComponent,
    MatCheckboxModule,
    MatMenuModule,
    ButtonComponent,
    IconActionComponent,
    CommonModule,
    StickyZoneComponent,
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
  private readonly pdfPrintService = inject(PdfPrintService);

  recipes: RecipeModel[] = [];
  filteredRecipes: RecipeModel[] = [];
  filters: Filter[] = [];
  selectedFilter = 'ALL';

  isLoading = true;
  isModalVisible = false;
  number = 0;

  item: RecipeModel | null = null;
  currentModalAction: TypeActionModal = TypeActionModal.Create;
  searchForm!: FormGroup;
  typeModal = TypeList.Recipes;
  typeSection = TypeList.Recipes;
  columnVisibility: Record<string, boolean> = {};
  displayedColumns: string[] = [];

  headerListRecipes: ColumnModel[] = [
    { title: 'Portada', key: 'img', sortable: false },
    { title: 'Titulo', key: 'title', sortable: true },
    {
      title: 'Categoria',
      key: 'category',
      sortable: true,
      backColor: true,
      width: ColumnWidth.SM,
    },
    { title: 'Autor/a', key: 'owner', sortable: true },
    {
      title: 'Ingredientes',
      key: 'ingredients',
      sortable: true,
      booleanIndicator: true,
      width: ColumnWidth.SM,
    },
    {
      title: 'Receta',
      key: 'recipe',
      sortable: true,
      booleanIndicator: true,
      width: ColumnWidth.XS,
    },
    { title: 'Año', key: 'year', sortable: true, width: ColumnWidth.XS },
  ];

  @ViewChild(InputSearchComponent)
  private inputSearchComponent!: InputSearchComponent;

  ngOnInit(): void {
    // Ocultar 'date_payment' y 'date_accounting' al cargar la página
    this.columnVisibility = this.generalService.setColumnVisibility(
      this.headerListRecipes,
      [''] // Coloca las columnas que deseas ocultar aquí
    );

    // Actualiza las columnas visibles según el estado de visibilidad
    this.displayedColumns = this.generalService.updateDisplayedColumns(
      this.headerListRecipes,
      this.columnVisibility
    );
    this.filters = [
      { code: 'NOVEDADES', name: 'Novedades' },
      { code: 'ALL', name: 'Histórico' },
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
    this.openModal(this.typeModal, TypeActionModal.Create, null);
  }

  onOpenModal(event: {
    typeModal: TypeList;
    action: TypeActionModal;
    item: RecipeModel;
  }): void {
    this.openModal(event.typeModal, event.action, event.item ?? null);
  }

  private openModal(
    typeModal: TypeList,
    action: TypeActionModal,
    recipe: RecipeModel | null
  ): void {
    this.currentModalAction = action;
    this.item = recipe;
    this.typeModal = typeModal;
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

  sendFormRecipe(event: { itemId: number; formData: FormData }): void {
    const save$ = event.itemId
      ? this.recipesFacade.editRecipe(event.itemId, event.formData)
      : this.recipesFacade.addRecipe(event.formData);

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
  printTableAsPdf(): void {
    this.pdfPrintService.printTableAsPdf('table-to-print', 'recetas.pdf');
  }
  getVisibleColumns() {
    return this.headerListRecipes.filter(
      (col) => this.columnVisibility[col.key]
    );
  }
  // Método para actualizar las columnas visibles cuando se hace toggle
  toggleColumn(key: string): void {
    // Cambia la visibilidad de la columna en columnVisibility
    this.columnVisibility[key] = !this.columnVisibility[key];
    // Actualiza las columnas visibles en la tabla después de cambiar el estado
    this.displayedColumns = this.generalService.updateDisplayedColumns(
      this.headerListRecipes,
      this.columnVisibility
    );
  }
}
