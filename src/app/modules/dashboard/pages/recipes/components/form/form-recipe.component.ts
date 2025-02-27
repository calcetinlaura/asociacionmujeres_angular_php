import { CommonModule } from '@angular/common';
import { Component, EventEmitter, inject, Input, Output } from '@angular/core';
import {
  AbstractControl,
  FormControl,
  FormGroup,
  ReactiveFormsModule,
  Validators,
} from '@angular/forms';
import { filter, tap } from 'rxjs';
import { RecipesFacade } from 'src/app/application';
import { RecipeModel } from 'src/app/core/interfaces/recipe.interface';
import { filterRecipes } from 'src/app/core/models/general.model';
import { RecipesService } from 'src/app/core/services/recipes.services';

import { EditorModule } from '@tinymce/tinymce-angular';
import { MatCardModule } from '@angular/material/card';
import { GeneralService } from 'src/app/shared/services/generalService.service';

@Component({
  selector: 'app-form-recipe',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, EditorModule, MatCardModule],
  templateUrl: './form-recipe.component.html',
  styleUrls: ['../../../../components/form/form.component.css'],
  providers: [RecipesService],
})
export class FormRecipeComponent {
  private recipesFacade = inject(RecipesFacade);
  private generalService = inject(GeneralService);

  @Input() itemId!: number;
  @Output() sendFormRecipe = new EventEmitter<RecipeModel>();

  recipeData: any;
  imageSrc: string = '';
  errorSession: boolean = false;
  submitted: boolean = false;
  titleForm: string = 'Registrar receta';
  buttonAction: string = 'Guardar';
  years: number[] = [];
  FilterRecipes = filterRecipes;

  formRecipe = new FormGroup({
    title: new FormControl('', [Validators.required]),
    category: new FormControl('', [Validators.required]),
    owner: new FormControl(''),
    recipe: new FormControl(''),
    ingredients: new FormControl(''),
    img: new FormControl(''),
    year: new FormControl(0, [
      Validators.required,
      Validators.min(1995),
      Validators.max(new Date().getFullYear()),
    ]),
  });

  ngOnInit(): void {
    const currentYear = this.generalService.currentYear;
    this.years = this.generalService.loadYears(currentYear, 2018);

    if (this.itemId) {
      this.recipesFacade.loadRecipeById(this.itemId);
      this.recipesFacade.selectedRecipe$
        .pipe(
          filter((recipe: RecipeModel | null) => recipe !== null),
          tap((recipe: RecipeModel | null) => {
            if (recipe) {
              this.formRecipe.patchValue(recipe);
              this.titleForm = 'Editar Receta';
              this.buttonAction = 'Guardar cambios';
            }
          })
        )
        .subscribe();
    }
  }

  onSendFormRecipe(): void {
    if (this.formRecipe.invalid) {
      this.submitted = true;
      return;
    }

    const formValue: RecipeModel = {
      title: this.formRecipe.get('title')?.value || '',
      category: this.formRecipe.get('category')?.value || '',
      owner: this.formRecipe.get('owner')?.value || '',
      recipe: this.formRecipe.get('recipe')?.value || '',
      ingredients: this.formRecipe.get('ingredients')?.value || '',
      img: this.formRecipe.get('img')?.value || '',
      year: this.formRecipe.get('year')?.value || 0,
    };

    this.sendFormRecipe.emit(formValue);
  }
}
