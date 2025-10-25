import { CommonModule } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  ElementRef,
  inject,
  OnInit,
  ViewChild,
} from '@angular/core';
import { takeUntilDestroyed, toSignal } from '@angular/core/rxjs-interop';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatMenuModule } from '@angular/material/menu';
import { map } from 'rxjs';

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

import { PdfPrintService } from 'src/app/core/services/PdfPrintService.service';
import { DashboardHeaderComponent } from 'src/app/shared/components/dashboard-header/dashboard-header.component';
import { FiltersComponent } from 'src/app/shared/components/filters/filters.component';
import { SpinnerLoadingComponent } from 'src/app/shared/components/spinner-loading/spinner-loading.component';
import { StickyZoneComponent } from 'src/app/shared/components/sticky-zone/sticky-zone.component';
import { TableComponent } from 'src/app/shared/components/table/table.component';

// Reutilizables
import { PageToolbarComponent } from 'src/app/shared/components/page-toolbar/page-toolbar.component';
import { useColumnVisibility } from 'src/app/shared/hooks/use-column-visibility';
import { useEntityList } from 'src/app/shared/hooks/use-entity-list';

// Modal shell + service
import { ModalShellComponent } from 'src/app/shared/components/modal/modal-shell.component';
import { ModalService } from 'src/app/shared/components/modal/services/modal.service';

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
    ModalShellComponent,
    PageToolbarComponent,
    // Angular
    CommonModule,
    MatCheckboxModule,
    MatMenuModule,
  ],
  templateUrl: './recipes-page.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class RecipesPageComponent implements OnInit {
  // Servicios
  private readonly destroyRef = inject(DestroyRef);
  private readonly modalService = inject(ModalService);
  private readonly recipesService = inject(RecipesService);
  private readonly pdfPrintService = inject(PdfPrintService);

  // Facade
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
      title: 'Resumen',
      key: 'summary',
      sortable: true,
      booleanIndicator: true,
      width: ColumnWidth.XS,
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

  // Reutilizables (columnas + lista)
  readonly col = useColumnVisibility('recipes-table', this.headerListRecipes);

  readonly list = useEntityList<RecipeModel>({
    filtered$: this.recipesFacade.filteredRecipes$.pipe(map((v) => v ?? [])),
    sort: (arr) => this.recipesService.sortRecipesById(arr),
    count: (arr) => this.recipesService.countRecipes(arr),
  });

  // Filtros
  filters: Filter[] = [];
  selectedFilter: string | number = '';

  // Modal
  readonly modalVisibleSig = toSignal(this.modalService.modalVisibility$, {
    initialValue: false,
  });
  item: RecipeModel | null = null;
  currentModalAction: TypeActionModal = TypeActionModal.Create;
  typeModal = TypeList.Recipes;
  typeSection = TypeList.Recipes;

  // Refs
  @ViewChild('printArea', { static: false })
  printArea!: ElementRef<HTMLElement>;

  // ──────────────────────────────────────────────────────────────────────────────
  // Lifecycle
  // ──────────────────────────────────────────────────────────────────────────────
  ngOnInit(): void {
    this.filters = [
      { code: 'NOVEDADES', name: 'Novedades' },
      { code: '', name: 'Histórico' },
      ...categoryFilterRecipes,
    ];
    this.filterSelected('NOVEDADES'); // carga inicial
  }

  // ──────────────────────────────────────────────────────────────────────────────
  // Filtros / búsqueda
  // ──────────────────────────────────────────────────────────────────────────────
  filterSelected(filter: string): void {
    this.selectedFilter = filter;

    // reset de búsqueda de texto (el input está en PageToolbar)
    this.recipesFacade.applyFilterWord('');

    if (!filter) {
      this.recipesFacade.loadAllRecipes();
    } else {
      this.recipesFacade.loadRecipesByFilter(filter);
    }
  }

  applyFilterWord = (keyword: string) =>
    this.recipesFacade.applyFilterWord(keyword);

  // ──────────────────────────────────────────────────────────────────────────────
  // Modal
  // ──────────────────────────────────────────────────────────────────────────────
  addNewRecipeModal(): void {
    this.onOpenModal({
      typeModal: this.typeModal,
      action: TypeActionModal.Create,
    });
  }

  onOpenModal(event: {
    typeModal: TypeList;
    action: TypeActionModal;
    item?: RecipeModel | null;
  }): void {
    // EDIT/SHOW → refresco por id para traer últimos cambios
    if (
      event.typeModal === TypeList.Recipes &&
      event.action !== TypeActionModal.Create
    ) {
      const id = event.item?.id;
      if (id) {
        this.recipesService
          .getRecipeById(id)
          .pipe(takeUntilDestroyed(this.destroyRef))
          .subscribe({
            next: (fresh) => {
              this.openModal(event.typeModal, event.action, fresh);
            },
            error: (err) => {
              console.error('Error cargando receta', err);

              this.openModal(event.typeModal, event.action, event.item ?? null);
            },
          });
        return;
      }
    }

    this.openModal(event.typeModal, event.action, event.item ?? null);
  }

  private openModal(
    typeModal: TypeList,
    action: TypeActionModal,
    recipe: RecipeModel | null
  ): void {
    this.currentModalAction = action;
    this.typeModal = typeModal;

    // Clonado defensivo
    this.item = recipe
      ? structuredClone?.(recipe) ?? JSON.parse(JSON.stringify(recipe))
      : null;

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

    save$.pipe(takeUntilDestroyed(this.destroyRef)).subscribe(() => {
      this.onCloseModal();
    });
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
