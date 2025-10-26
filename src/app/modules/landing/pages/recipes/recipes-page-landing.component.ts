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
import { filter, map, take, tap } from 'rxjs';
import { ModalFacade } from 'src/app/application/modal.facade';

import { RecipesFacade } from 'src/app/application/recipes.facade';
import { Filter } from 'src/app/core/interfaces/general.interface';
import {
  categoryFilterRecipes,
  RecipeModel,
} from 'src/app/core/interfaces/recipe.interface';
import { TypeActionModal, TypeList } from 'src/app/core/models/general.model';
import { GeneralService } from 'src/app/core/services/generalService.service';
import { RecipesService } from 'src/app/core/services/recipes.services';

import { FiltersComponent } from 'src/app/shared/components/filters/filters.component';
import { InputSearchComponent } from 'src/app/shared/components/inputs/input-search/input-search.component';

import { NoResultsComponent } from 'src/app/shared/components/no-results/no-results.component';
import { SectionGenericComponent } from 'src/app/shared/components/section-generic/section-generic.component';
import { SpinnerLoadingComponent } from 'src/app/shared/components/spinner-loading/spinner-loading.component';

import { ModalShellComponent } from 'src/app/shared/components/modal/modal-shell.component';
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
    ModalShellComponent,
  ],
  templateUrl: './recipes-page-landing.component.html',
})
export class RecipesPageLandingComponent implements OnInit {
  // ===== Inyección de dependencias =====
  private readonly destroyRef = inject(DestroyRef);
  private readonly route = inject(ActivatedRoute);
  private readonly recipesService = inject(RecipesService);
  private readonly generalService = inject(GeneralService);

  readonly recipesFacade = inject(RecipesFacade);
  readonly modalFacade = inject(ModalFacade);

  // ===== Signals derivadas con useEntityList =====
  readonly list = useEntityList<RecipeModel>({
    filtered$: this.recipesFacade.filteredRecipes$,
    map: (arr) => arr,
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

  // ======================================================
  // 🧭 Ciclo de vida
  // ======================================================
  ngOnInit(): void {
    this.filters = [{ code: '', name: 'Todas' }, ...categoryFilterRecipes];

    // Deep-link inicial
    const initialId = this.route.snapshot.paramMap.get('id');
    if (initialId) {
      this.handleDeepLinkById(Number(initialId));
    } else {
      this.filterSelected('');
    }

    // Reacciona a cambios en la URL
    this.route.paramMap
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        map((pm) => pm.get('id')),
        tap((id) => {
          if (id) this.handleDeepLinkById(Number(id));
          else this.filterSelected('');
        })
      )
      .subscribe();
  }

  // ======================================================
  // 🎯 Deep-link: carga receta y abre modal
  // ======================================================
  private handleDeepLinkById(id: number): void {
    if (!Number.isFinite(id)) {
      this.filterSelected('');
      return;
    }

    this.recipesFacade.loadRecipeById(id);
    this.recipesFacade.selectedRecipe$
      .pipe(
        filter((r): r is RecipeModel => !!r),
        takeUntilDestroyed(this.destroyRef),
        take(1)
      )
      .subscribe((recipe) => {
        const catCode = this.pickCategoryFilterCode(recipe);

        if (catCode) {
          this.selectedFilter = catCode;
          this.recipesFacade.loadRecipesByFilter(catCode);
        } else {
          this.filterSelected('');
        }

        // 👉 Abre automáticamente la modal
        this.modalFacade.open(TypeList.Recipes, TypeActionModal.Show, recipe);
      });
  }

  // ======================================================
  // 🧩 Filtros y búsqueda
  // ======================================================
  filterSelected(filter: string): void {
    this.selectedFilter = filter;
    this.generalService.clearSearchInput(this.inputSearchComponent);

    if (filter === '') {
      this.recipesFacade.loadAllRecipes();
    } else {
      this.recipesFacade.loadRecipesByFilter(filter);
    }
  }

  applyFilterWord(keyword: string): void {
    this.recipesFacade.applyFilterWord(keyword);
  }

  // ======================================================
  // 🍳 Acciones con modal
  // ======================================================
  openRecipeDetails(recipe: RecipeModel): void {
    this.modalFacade.open(TypeList.Recipes, TypeActionModal.Show, recipe);
  }

  closeModal(): void {
    this.modalFacade.close();
  }

  // ======================================================
  // 🧠 Helpers
  // ======================================================
  private pickCategoryFilterCode(r: RecipeModel): string | null {
    const code = (r as any)?.category;
    return code ? String(code).toUpperCase() : null;
  }
}
