import { CommonModule } from '@angular/common';
import { Component, EventEmitter, inject, Input, Output } from '@angular/core';
import {
  FormControl,
  FormGroup,
  ReactiveFormsModule,
  Validators,
} from '@angular/forms';
import { MatCardModule } from '@angular/material/card';

import { filter, tap } from 'rxjs';
import { RecipesFacade } from 'src/app/application/recipes.facade';
import {
  categoryFilterRecipes,
  RecipeModel,
} from 'src/app/core/interfaces/recipe.interface';
import { TypeList } from 'src/app/core/models/general.model';
import { ImageControlComponent } from 'src/app/modules/dashboard/components/image-control/image-control.component';
import { GeneralService } from 'src/app/shared/services/generalService.service';

@Component({
  selector: 'app-form-recipe',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,

    MatCardModule,
    ImageControlComponent,
  ],
  templateUrl: './form-recipe.component.html',
  styleUrls: ['../../../../components/form/form.component.css'],
})
export class FormRecipeComponent {
  private recipesFacade = inject(RecipesFacade);
  private generalService = inject(GeneralService);

  @Input() itemId!: number;
  @Output() sendFormRecipe = new EventEmitter<{
    itemId: number;
    formData: FormData;
  }>();
  selectedImageFile: File | null = null;
  recipeData: any;
  imageSrc: string = '';
  errorSession: boolean = false;
  submitted: boolean = false;
  titleForm: string = 'Registrar receta';
  buttonAction: string = 'Guardar';
  years: number[] = [];
  FilterRecipes = categoryFilterRecipes;
  typeList = TypeList.Recipes;
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
  currentYear = this.generalService.currentYear;

  ngOnInit(): void {
    this.years = this.generalService.loadYears(this.currentYear, 2018);

    if (this.itemId) {
      this.recipesFacade.loadRecipeById(this.itemId);
      this.recipesFacade.selectedRecipe$
        .pipe(
          filter((recipe: RecipeModel | null) => recipe !== null),
          tap((recipe: RecipeModel | null) => {
            if (recipe) {
              this.formRecipe.patchValue(recipe);
              // {
              //   title: recipe.title || null,
              //   category: recipe.category || null,
              //   ingredients: recipe.ingredients || null,
              //   owner: recipe.owner || null,
              //   recipe: recipe.recipe || null,
              //   img: recipe.img || null,
              //   year: recipe.year || 0,
              // }
              this.titleForm = 'Editar Receta';
              this.buttonAction = 'Guardar cambios';
              if (recipe.img) {
                this.imageSrc = recipe.img;
                this.selectedImageFile = null;
              }
            }
          })
        )
        .subscribe();
    }
  }

  async onImageSelected(file: File) {
    const result = await this.generalService.handleFileSelection(file);
    this.selectedImageFile = result.file;
    this.imageSrc = result.imageSrc;
  }

  onSendFormRecipe(): void {
    if (this.formRecipe.invalid) {
      this.submitted = true;
      console.log('Formulario inválido', this.formRecipe.errors);
      return;
    }

    const rawValues = { ...this.formRecipe.getRawValue() } as any;

    const formData = this.generalService.createFormData(
      rawValues,
      {
        img: this.selectedImageFile,
      },
      this.itemId
    );

    this.sendFormRecipe.emit({ itemId: this.itemId, formData: formData });
  }
}
