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
import { RecipeModel } from 'src/app/core/interfaces/recipe.interface';
import { TypeActionModal, TypeList } from 'src/app/core/models/general.model';

import { FiltersComponent } from 'src/app/shared/components/filters/filters.component';
import { InputSearchComponent } from 'src/app/shared/components/inputs/input-search/input-search.component';

import { NoResultsComponent } from 'src/app/shared/components/no-results/no-results.component';
import { SectionGenericComponent } from 'src/app/shared/components/section-generic/section-generic.component';
import { SpinnerLoadingComponent } from 'src/app/shared/components/spinner-loading/spinner-loading.component';

import { FiltersFacade } from 'src/app/application/filters.facade';
import { ModalShellComponent } from 'src/app/shared/components/modal/modal-shell.component';
import { useEntityList } from 'src/app/shared/hooks/use-entity-list';
import { count, sortByTitle } from 'src/app/shared/utils/facade.utils';

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
  private readonly destroyRef = inject(DestroyRef);
  private readonly route = inject(ActivatedRoute);

  readonly modalFacade = inject(ModalFacade);
  readonly filtersFacade = inject(FiltersFacade);
  readonly recipesFacade = inject(RecipesFacade);

  // ===== Lista derivada con useEntityList =====
  readonly list = useEntityList<RecipeModel>({
    filtered$: this.recipesFacade.filteredRecipes$,
    map: (arr) => arr,
    sort: (arr) => sortByTitle(arr),
    count: (arr) => count(arr),
  });

  readonly totalSig = this.list.countSig;
  readonly hasResultsSig = computed(() => this.totalSig() > 0);
  readonly TypeList = TypeList;

  @ViewChild(InputSearchComponent)
  private inputSearchComponent!: InputSearchComponent;

  @ViewChild('printArea', { static: false })
  printArea!: ElementRef<HTMLElement>;

  // ======================================================
  // 🧭 Ciclo de vida
  // ======================================================
  ngOnInit(): void {
    // Carga inicial de filtros globales
    this.filtersFacade.loadFiltersFor(TypeList.Recipes);

    // Reacciona a cambios en la URL
    this.route.paramMap
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        map((pm) => pm.get('id')),
        tap((id) => {
          if (id) {
            this.handleDeepLinkById(Number(id));
          }
        })
      )
      .subscribe();
  }

  ngAfterViewInit(): void {
    //  Solo se llama si NO hay id en la URL
    const initialId = this.route.snapshot.paramMap.get('id');
    if (!initialId) {
      setTimeout(() => this.filterSelected(''));
    }
  }

  // ======================================================
  //  Deep-link: carga receta y abre modal
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
        take(1),
        takeUntilDestroyed(this.destroyRef),
        tap((recipe) => {
          const catCode = this.pickCategoryFilterCode(recipe);

          if (catCode) {
            this.filtersFacade.selectFilter(catCode);
            this.recipesFacade.loadRecipesByFilter(catCode);
          } else {
            this.filterSelected('');
          }

          // 👉 Abre automáticamente la modal
          this.modalFacade.open(TypeList.Recipes, TypeActionModal.Show, recipe);
        })
      )
      .subscribe();
  }

  // ======================================================
  //  Filtros y búsqueda
  // ======================================================
  filterSelected(filter: string): void {
    this.filtersFacade.selectFilter(filter);
    if (this.inputSearchComponent) {
      this.filtersFacade.clearSearchInput(this.inputSearchComponent);
    }

    if (filter === '') {
      this.recipesFacade.loadAllRecipes();
    } else {
      this.recipesFacade.loadRecipesByFilter(filter);
    }
  }

  applyFilterWord(keyword: string): void {
    this.filtersFacade.setSearch(keyword);
    this.recipesFacade.applyFilterWord(keyword);
  }

  // ======================================================
  //  Acciones con modal
  // ======================================================
  openRecipeDetails(recipe: RecipeModel): void {
    this.modalFacade.open(TypeList.Recipes, TypeActionModal.Show, recipe);
  }

  closeModal(): void {
    this.modalFacade.close();
  }

  // ======================================================
  //  Helpers
  // ======================================================
  private pickCategoryFilterCode(r: RecipeModel): string | null {
    const code = (r as any)?.category;
    return code ? String(code).toUpperCase() : null;
  }
}
