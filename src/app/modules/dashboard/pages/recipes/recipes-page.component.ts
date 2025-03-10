import {
  Component,
  DestroyRef,
  ElementRef,
  HostListener,
  inject,
  OnInit,
  ViewChild,
} from '@angular/core';
import { DashboardHeaderComponent } from 'src/app/modules/dashboard/components/dashboard-header/dashboard-header.component';
import { TypeActionModal, TypeList } from 'src/app/core/models/general.model';
import { ColumnModel } from 'src/app/core/interfaces/column.interface';
import { RecipesService } from 'src/app/core/services/recipes.services';
import { TableComponent } from 'src/app/modules/dashboard/components/table/table.component';
import { ModalComponent } from 'src/app/shared/components/modal/modal.component';
import { CommonModule } from '@angular/common';
import { RecipesFacade } from 'src/app/application';
import { FormControl, FormGroup, ReactiveFormsModule } from '@angular/forms';
import { ModalService } from 'src/app/shared/components/modal/services/modal.service';
import { tap } from 'rxjs';
import { AddButtonComponent } from 'src/app/shared/components/buttons/button-add/button-add.component';
import { InputSearchComponent } from 'src/app/shared/components/inputs/input-search/input-search.component';
import { RecipeModel } from 'src/app/core/interfaces/recipe.interface';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { SpinnerLoadingComponent } from '../../../landing/components/spinner-loading/spinner-loading.component';

@Component({
  selector: 'app-recipes-page',
  standalone: true,
  imports: [
    CommonModule,
    DashboardHeaderComponent,
    TableComponent,
    ModalComponent,
    AddButtonComponent,
    ReactiveFormsModule,
    InputSearchComponent,
    SpinnerLoadingComponent,
  ],
  providers: [RecipesService],
  templateUrl: './recipes-page.component.html',
  styleUrl: './recipes-page.component.css',
})
export class RecipesPageComponent implements OnInit {
  private recipesFacade = inject(RecipesFacade);
  private modalService = inject(ModalService);
  private destroyRef = inject(DestroyRef);

  typeList = TypeList.Recipes;
  recipes: RecipeModel[] = [];
  filteredRecipes: RecipeModel[] = [];
  searchForm!: FormGroup;
  dataLoaded: boolean = false;
  number: number = 0;
  headerListRecipes: ColumnModel[] = [];
  isModalVisible: boolean = false;
  currentModalAction: TypeActionModal = TypeActionModal.Create;
  item: any;
  searchKeywordFilter = new FormControl();
  isStickyToolbar: boolean = false;

  @ViewChild('toolbar') toolbar!: ElementRef;

  @HostListener('window:scroll', [])
  onWindowScroll() {
    const scrollPosition =
      window.scrollY ||
      document.documentElement.scrollTop ||
      document.body.scrollTop ||
      0;

    if (scrollPosition > 50) {
      this.isStickyToolbar = true;
    } else {
      this.isStickyToolbar = false;
    }
  }

  ngOnInit(): void {
    this.loadAllRecipes();

    this.modalService.modalVisibility$
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        tap((isVisible) => {
          this.isModalVisible = isVisible;
        })
      )
      .subscribe();

    this.headerListRecipes = [
      { title: 'Portada', key: 'img' },
      { title: 'Titulo', key: 'title' },
      { title: 'Categoria', key: 'category' },
      { title: 'Autor/a', key: 'owner' },
      { title: 'Ingredientes', key: 'ingredients' },
      { title: 'Receta', key: 'recipe' },
      { title: 'Año', key: 'year' },
    ];
  }

  loadAllRecipes(): void {
    this.recipesFacade.loadAllRecipes();
    this.recipesFacade.recipes$
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        tap((recipes) => {
          this.updateRecipeState(recipes);
        })
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

  confirmDeleteRecipe(item: any): void {
    this.recipesFacade.deleteRecipe(item.id);
    this.modalService.closeModal();
  }

  addNewRecipeModal(): void {
    this.currentModalAction = TypeActionModal.Create;
    this.item = null;
    this.modalService.openModal();
  }

  onOpenModal(event: { action: TypeActionModal; item: any }): void {
    this.currentModalAction = event.action;
    this.item = event.item;
    this.modalService.openModal();
  }

  onCloseModal(): void {
    this.modalService.closeModal();
  }

  sendFormRecipe(event: { itemId: number; newRecipeData: FormData }): void {
    if (event.itemId) {
      this.recipesFacade
        .editRecipe(event.itemId, event.newRecipeData)
        .pipe(
          takeUntilDestroyed(this.destroyRef),
          tap(() => {
            this.onCloseModal();
          })
        )
        .subscribe();
    } else {
      this.recipesFacade
        .addRecipe(event.newRecipeData)
        .pipe(
          takeUntilDestroyed(this.destroyRef),
          tap(() => {
            this.onCloseModal();
          })
        )
        .subscribe();
    }
  }

  private updateRecipeState(recipes: RecipeModel[] | null): void {
    if (recipes === null) {
      return;
    }
    this.recipes = recipes.sort((a, b) =>
      a.title.localeCompare(b.title, undefined, { sensitivity: 'base' })
    );
    this.filteredRecipes = [...this.recipes];
    this.number = this.recipes.length;
    this.dataLoaded = true;
  }
}
