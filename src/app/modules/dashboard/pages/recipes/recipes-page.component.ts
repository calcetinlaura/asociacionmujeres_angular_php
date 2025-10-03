import { CommonModule } from '@angular/common';
import {
  Component,
  computed,
  DestroyRef,
  ElementRef,
  inject,
  OnInit,
  Signal,
  ViewChild,
  WritableSignal,
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
import { IconActionComponent } from 'src/app/shared/components/buttons/icon-action/icon-action.component';
import { InputSearchComponent } from 'src/app/shared/components/inputs/input-search/input-search.component';
import { SpinnerLoadingComponent } from 'src/app/shared/components/spinner-loading/spinner-loading.component';
import { GeneralService } from 'src/app/shared/services/generalService.service';
import { PdfPrintService } from 'src/app/shared/services/PdfPrintService.service';

import { StickyZoneComponent } from '../../components/sticky-zone/sticky-zone.component';
import { ColumnMenuComponent } from '../../components/table/column-menu.component';

// Nuevo: shell de modal reutilizable
import { ModalShellComponent } from 'src/app/shared/components/modal/modal-shell.component';
// Nuevo: store de visibilidad de columnas (signals + persistencia)
import { ModalService } from 'src/app/shared/components/modal/services/modal.service';
import { ColumnVisibilityStore } from '../../components/table/column-visibility.store';

@Component({
  selector: 'app-recipes-page',
  standalone: true,
  imports: [
    // UI
    DashboardHeaderComponent,
    SpinnerLoadingComponent,
    StickyZoneComponent,
    TableComponent,
    FiltersComponent,
    ButtonIconComponent,
    IconActionComponent,
    InputSearchComponent,
    ColumnMenuComponent,
    ModalShellComponent,
    // Angular
    CommonModule,
    ReactiveFormsModule,
    MatCheckboxModule,
    MatMenuModule,
  ],
  templateUrl: './recipes-page.component.html',
})
export class RecipesPageComponent implements OnInit {
  // Servicios
  private readonly destroyRef = inject(DestroyRef);
  private readonly modalService = inject(ModalService);
  private readonly recipesService = inject(RecipesService);
  private readonly generalService = inject(GeneralService);
  private readonly pdfPrintService = inject(PdfPrintService);
  private readonly colStore = inject(ColumnVisibilityStore);

  // Facade (pública para async pipe si la usas)
  readonly recipesFacade = inject(RecipesFacade);

  // Columnas
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
      title: 'Introducción',
      key: 'introduction',
      sortable: true,
      booleanIndicator: true,
      width: ColumnWidth.SM,
    },
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
    {
      title: 'Año',
      key: 'year',
      sortable: true,
      width: ColumnWidth.XS,
      textAlign: 'center',
    },
  ];

  // Datos
  recipes: RecipeModel[] = [];
  filteredRecipes: RecipeModel[] = [];
  number = 0;

  // Filtros
  filters: Filter[] = [];
  selectedFilter = '';

  // Modal
  isModalVisible = false;
  item: RecipeModel | null = null;
  currentModalAction: TypeActionModal = TypeActionModal.Create;
  typeModal = TypeList.Recipes;
  typeSection = TypeList.Recipes;

  // Form
  searchForm!: FormGroup;

  // Signals para columnas
  columnVisSig!: WritableSignal<Record<string, boolean>>;
  displayedColumnsSig!: Signal<string[]>;

  // Refs
  @ViewChild(InputSearchComponent)
  private inputSearchComponent!: InputSearchComponent;

  @ViewChild('printArea', { static: false })
  printArea!: ElementRef<HTMLElement>;

  // ──────────────────────────────────────────────────────────────────────────────
  // Lifecycle
  // ──────────────────────────────────────────────────────────────────────────────
  ngOnInit(): void {
    // 1) Visibilidad de columnas persistente
    this.columnVisSig = this.colStore.init(
      'recipes-table', // clave única para esta tabla
      this.headerListRecipes,
      [] // columnas ocultas por defecto
    );

    // 2) Derivar las keys visibles para la tabla
    this.displayedColumnsSig = computed(() =>
      this.colStore.displayedColumns(
        this.headerListRecipes,
        this.columnVisSig()
      )
    );

    // 3) Filtros
    this.filters = [
      { code: 'NOVEDADES', name: 'Novedades' },
      { code: '', name: 'Histórico' },
      ...categoryFilterRecipes,
    ];

    // 4) Visibilidad de la modal
    this.modalService.modalVisibility$
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        tap((isVisible) => (this.isModalVisible = isVisible))
      )
      .subscribe();

    // 5) Carga inicial
    this.filterSelected('NOVEDADES');

    // 6) Estado desde la facade
    this.recipesFacade.filteredRecipes$
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        tap((recipes) => this.updateRecipeState(recipes))
      )
      .subscribe();
  }

  // ──────────────────────────────────────────────────────────────────────────────
  // Filtros / búsqueda
  // ──────────────────────────────────────────────────────────────────────────────
  filterSelected(filter: string): void {
    this.selectedFilter = filter;
    this.generalService.clearSearchInput(this.inputSearchComponent);

    if (!filter) {
      this.recipesFacade.loadAllRecipes();
    } else {
      this.recipesFacade.loadRecipesByFilter(filter);
    }
  }

  applyFilterWord(keyword: string): void {
    this.recipesFacade.applyFilterWord(keyword);
  }

  // ──────────────────────────────────────────────────────────────────────────────
  // Modal
  // ──────────────────────────────────────────────────────────────────────────────
  addNewRecipeModal(): void {
    this.openModal(TypeList.Recipes, TypeActionModal.Create, null);
  }

  onOpenModal(event: {
    typeModal: TypeList;
    action: TypeActionModal;
    item?: RecipeModel;
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

    // Limpiar el seleccionado SOLO en CREATE (evita abrir vacío al ver/editar)
    if (typeModal === TypeList.Recipes && action === TypeActionModal.Create) {
      this.recipesFacade.clearSelectedRecipe();
    }

    this.modalService.openModal();
  }

  onCloseModal(): void {
    this.modalService.closeModal();
    this.item = null;
  }

  // ──────────────────────────────────────────────────────────────────────────────
  // CRUD
  // ──────────────────────────────────────────────────────────────────────────────
  onDelete({ type, id }: { type: TypeList; id: number }) {
    const actions: Partial<Record<TypeList, (id: number) => void>> = {
      [TypeList.Recipes]: (x) => this.recipesFacade.deleteRecipe(x),
    };
    actions[type]?.(id);
  }

  sendFormRecipe(event: { itemId: number; formData: FormData }): void {
    const save$ = event.itemId
      ? this.recipesFacade.editRecipe(event.formData)
      : this.recipesFacade.addRecipe(event.formData);

    save$
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        tap(() => this.onCloseModal())
      )
      .subscribe();
  }

  // ──────────────────────────────────────────────────────────────────────────────
  // Tabla helpers
  // ──────────────────────────────────────────────────────────────────────────────
  private updateRecipeState(recipes: RecipeModel[] | null): void {
    if (!recipes) return;

    this.recipes = this.recipesService.sortRecipesById(recipes);
    this.filteredRecipes = [...this.recipes];
    this.number = this.recipesService.countRecipes(recipes);
  }

  getVisibleColumns() {
    return this.colStore.visibleColumnModels(
      this.headerListRecipes,
      this.columnVisSig()
    );
  }

  toggleColumn(key: string): void {
    this.colStore.toggle('recipes-table', this.columnVisSig, key);
  }

  // ──────────────────────────────────────────────────────────────────────────────
  // Impresión
  // ──────────────────────────────────────────────────────────────────────────────
  async printTableAsPdf(): Promise<void> {
    if (!this.printArea) return;

    await this.pdfPrintService.printElementAsPdf(this.printArea, {
      filename: 'recetas.pdf',
      preset: 'compact',
      orientation: 'portrait',
      format: 'a4',
      margins: [5, 5, 5, 5],
    });
  }
}
