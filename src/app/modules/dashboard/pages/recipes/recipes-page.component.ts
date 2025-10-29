import { CommonModule } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  ElementRef,
  OnInit,
  ViewChild,
  computed,
  inject,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatMenuModule } from '@angular/material/menu';
import { map, tap } from 'rxjs';

import { FiltersFacade } from 'src/app/application/filters.facade';
import { ModalFacade } from 'src/app/application/modal.facade';
import { RecipesFacade } from 'src/app/application/recipes.facade';

import {
  ColumnModel,
  ColumnWidth,
} from 'src/app/core/interfaces/column.interface';
import { RecipeModel } from 'src/app/core/interfaces/recipe.interface';
import { TypeActionModal, TypeList } from 'src/app/core/models/general.model';

import { PdfPrintService } from 'src/app/core/services/PdfPrintService.service';

import { DashboardHeaderComponent } from 'src/app/shared/components/dashboard-header/dashboard-header.component';
import { FiltersComponent } from 'src/app/shared/components/filters/filters.component';
import { ModalShellComponent } from 'src/app/shared/components/modal/modal-shell.component';
import { PageToolbarComponent } from 'src/app/shared/components/page-toolbar/page-toolbar.component';
import { SpinnerLoadingComponent } from 'src/app/shared/components/spinner-loading/spinner-loading.component';
import { StickyZoneComponent } from 'src/app/shared/components/sticky-zone/sticky-zone.component';
import { TableComponent } from 'src/app/shared/components/table/table.component';

import { useColumnVisibility } from 'src/app/shared/hooks/use-column-visibility';
import { useEntityList } from 'src/app/shared/hooks/use-entity-list';
import { count, sortByTitle } from 'src/app/shared/utils/facade.utils';

@Component({
  selector: 'app-recipes-page',
  standalone: true,
  imports: [
    DashboardHeaderComponent,
    SpinnerLoadingComponent,
    StickyZoneComponent,
    TableComponent,
    FiltersComponent,
    ModalShellComponent,
    PageToolbarComponent,
    CommonModule,
    MatMenuModule,
    MatCheckboxModule,
  ],
  templateUrl: './recipes-page.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class RecipesPageComponent implements OnInit {
  // ─────────────── Inyecciones ───────────────
  private readonly destroyRef = inject(DestroyRef);
  private readonly modalFacade = inject(ModalFacade);
  private readonly pdfPrintService = inject(PdfPrintService);
  readonly recipesFacade = inject(RecipesFacade);
  readonly filtersFacade = inject(FiltersFacade);

  @ViewChild(PageToolbarComponent)
  private toolbarComponent!: PageToolbarComponent;

  // ─────────────── Columnas ───────────────
  headerListRecipes: ColumnModel[] = [
    { title: 'Portada', key: 'img', sortable: false },
    { title: 'Título', key: 'title', sortable: true },
    {
      title: 'Categoría',
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

  readonly col = useColumnVisibility('recipes-table', this.headerListRecipes);

  // ─────────────── Lista derivada ───────────────
  readonly list = useEntityList<RecipeModel>({
    filtered$: this.recipesFacade.filteredRecipes$.pipe(map((v) => v ?? [])),
    sort: (arr) => sortByTitle(arr),
    count: (arr) => count(arr),
  });

  readonly TypeList = TypeList;
  readonly hasRowsSig = computed(() => this.list.countSig() > 0);

  // ─────────────── Modal (signals) ───────────────
  readonly modalVisibleSig = this.modalFacade.isVisibleSig;
  readonly currentModalTypeSig = this.modalFacade.typeSig;
  readonly currentModalActionSig = this.modalFacade.actionSig;
  readonly currentItemSig = this.modalFacade.itemSig;

  // ─────────────── Impresión ───────────────
  @ViewChild('printArea', { static: false })
  printArea!: ElementRef<HTMLElement>;

  // ─────────────── Lifecycle ───────────────
  ngOnInit(): void {
    //  Cargar filtros desde FiltersFacade
    this.filtersFacade.loadFiltersFor(TypeList.Recipes);
  }

  ngAfterViewInit(): void {
    //  Inicializa con filtro por defecto
    setTimeout(() => this.filterSelected(''));
  }

  // ─────────────── Filtros / búsqueda ───────────────
  filterSelected(filter: string): void {
    this.filtersFacade.selectFilter(filter);

    //  Limpia el buscador del toolbar
    if (this.toolbarComponent) {
      this.toolbarComponent.clearSearch();
    }

    // Limpia búsqueda anterior
    this.filtersFacade.setSearch('');
    this.recipesFacade.applyFilterWord('');

    // Carga según el filtro
    if (!filter || filter === 'HISTÓRICO' || filter === '') {
      this.recipesFacade.loadAllRecipes();
    } else {
      this.recipesFacade.loadRecipesByFilter(filter);
    }
  }

  applyFilterWord(keyword: string): void {
    this.filtersFacade.setSearch(keyword);
    this.recipesFacade.applyFilterWord(keyword);
  }

  // ─────────────── Modal + CRUD ───────────────
  addNewRecipeModal(): void {
    this.recipesFacade.clearSelectedRecipe();
    this.modalFacade.open(TypeList.Recipes, TypeActionModal.Create, null);
  }

  onOpenModal(event: {
    typeModal: TypeList;
    action: TypeActionModal;
    item?: RecipeModel;
  }): void {
    this.modalFacade.open(event.typeModal, event.action, event.item ?? null);
  }

  onCloseModal(): void {
    this.modalFacade.close();
  }

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
        tap(() => this.modalFacade.close())
      )
      .subscribe();
  }

  // ─────────────── Impresión ───────────────
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
