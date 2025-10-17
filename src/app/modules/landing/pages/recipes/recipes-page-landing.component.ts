import { CommonModule } from '@angular/common';
import {
  Component,
  computed,
  DestroyRef,
  ElementRef,
  inject,
  OnInit,
  ViewChild,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ActivatedRoute } from '@angular/router';
import { take } from 'rxjs';

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

// Hook reutilizable
import { useEntityList } from 'src/app/shared/hooks/use-entity-list';

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

  // ===== Signals derivadas con useEntityList =====
  readonly list = useEntityList<RecipeModel>({
    filtered$: this.recipesFacade.filteredRecipes$, // puede emitir null; el hook lo normaliza
    map: (arr) => arr, // opcional para transformar
    sort: (arr) => this.recipesService.sortRecipesByTitle(arr),
    count: (arr) => this.recipesService.countRecipes(arr),
  });
  readonly totalSig = this.list.countSig;
  readonly hasResultsSig = computed(() => this.totalSig() > 0);

  // ===== Filtros / UI =====
  filters: Filter[] = [];
  selectedFilter: string | number = '';
  typeList = TypeList;

  @ViewChild(InputSearchComponent)
  private inputSearchComponent!: InputSearchComponent;

  @ViewChild('printArea', { static: false })
  printArea!: ElementRef<HTMLElement>;

  ngOnInit(): void {
    // 1) Filtros: "Todas" + categorías
    this.filters = [{ code: '', name: 'Todas' }, ...categoryFilterRecipes];

    // 2) Ruta inicial: /recipes/:id -> filtra por categoría de esa receta; si no, "Todas"
    const initialId = this.route.snapshot.paramMap.get('id');
    if (initialId) {
      this.handleDeepLinkById(Number(initialId));
    } else {
      this.filterSelected('');
    }
  }

  private handleDeepLinkById(id: number): void {
    if (!Number.isFinite(id)) {
      this.filterSelected('');
      return;
    }

    // Carga la receta -> extrae categoría -> aplica filtro por categoría
    this.recipesService
      .getRecipeById(id)
      .pipe(takeUntilDestroyed(this.destroyRef), take(1))
      .subscribe({
        next: (recipe) => {
          const catCode = this.pickCategoryFilterCode(recipe);
          if (catCode) {
            this.selectedFilter = catCode;
            this.recipesFacade.loadRecipesByFilter(catCode);
          } else {
            this.filterSelected('');
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

  // === Helpers ===
  private pickCategoryFilterCode(r: RecipeModel): string | null {
    const code = (r as any)?.category; // p.ej., "POSTRES", "ENTRANTES", etc.
    return code ? String(code) : null;
  }
}
