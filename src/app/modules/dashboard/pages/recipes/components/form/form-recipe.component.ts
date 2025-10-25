import { CommonModule } from '@angular/common';
import { Component, EventEmitter, inject, Input, Output } from '@angular/core';
import {
  FormControl,
  FormGroup,
  ReactiveFormsModule,
  Validators,
} from '@angular/forms';
import { MatCardModule } from '@angular/material/card';
import { QuillModule } from 'ngx-quill';

import { filter, tap } from 'rxjs';
import { RecipesFacade } from 'src/app/application/recipes.facade';
import {
  categoryFilterRecipes,
  RecipeModel,
} from 'src/app/core/interfaces/recipe.interface';
import { TypeList } from 'src/app/core/models/general.model';
import { ImageControlComponent } from 'src/app/shared/components/image-control/image-control.component';
import { SpinnerLoadingComponent } from 'src/app/shared/components/spinner-loading/spinner-loading.component';
import { ScrollToFirstErrorDirective } from 'src/app/shared/directives/scroll-to-first-error.directive';
import { GeneralService } from 'src/app/shared/services/generalService.service';

@Component({
  selector: 'app-form-recipe',
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatCardModule,
    ImageControlComponent,
    QuillModule,
    SpinnerLoadingComponent,
    ScrollToFirstErrorDirective,
  ],
  templateUrl: './form-recipe.component.html',
  styleUrls: ['./../../../../../../shared/components/form/form.component.css'],
})
export class FormRecipeComponent {
  private recipesFacade = inject(RecipesFacade);
  private generalService = inject(GeneralService);

  @Input() itemId!: number;
  @Output() submitForm = new EventEmitter<{
    itemId: number;
    formData: FormData;
  }>();

  selectedImageFile: File | null = null;
  recipeData: any;
  imageSrc: string = '';
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
    summary: new FormControl('', [Validators.maxLength(300)]),
    introduction: new FormControl('', [Validators.maxLength(2000)]),
    recipe: new FormControl('', [Validators.maxLength(2000)]),
    ingredients: new FormControl('', [Validators.maxLength(2000)]),
    img: new FormControl(''),
    year: new FormControl<number | null>(null, [
      Validators.required,
      Validators.min(1995),
      Validators.max(new Date().getFullYear()),
    ]),
  });
  currentYear = this.generalService.currentYear;
  isLoading = true;
  quillModules = {
    toolbar: [
      [{ header: [1, 2, false] }],
      ['bold', 'italic', 'underline'],
      ['image', 'code-block'],
      [{ color: [] }, { background: [] }],
      [{ list: 'ordered' }, { list: 'bullet' }],
      [{ align: [] }],
      ['link', 'clean'],
      [{ indent: '-1' }, { indent: '+1' }],
    ],
  };
  ngOnInit(): void {
    this.isLoading = true;
    this.years = this.generalService.loadYears(this.currentYear, 2018);

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
              if (recipe.img) {
                this.imageSrc = recipe.img;
                this.selectedImageFile = null;
              }
            }
            this.isLoading = false;
          })
        )
        .subscribe();
    } else {
      this.isLoading = false;
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
    } else {
      console.log('Formulario válido');
    }

    const rawValues = { ...this.formRecipe.getRawValue() } as any;
    if (rawValues.introduction) {
      rawValues.introduction = rawValues.introduction.replace(/&nbsp;/g, ' ');
    }
    if (rawValues.ingredients) {
      rawValues.ingredients = rawValues.ingredients.replace(/&nbsp;/g, ' ');
    }
    if (rawValues.recipe) {
      rawValues.recipe = rawValues.recipe.replace(/&nbsp;/g, ' ');
    }
    const formData = this.generalService.createFormData(
      rawValues,
      {
        img: this.selectedImageFile,
      },
      this.itemId
    );

    this.submitForm.emit({ itemId: this.itemId, formData: formData });
  }

  summaryLen(): number {
    return (this.formRecipe.get('summary')?.value || '').length;
  }
  introductionLen(): number {
    return (this.formRecipe.get('introduction')?.value || '').length;
  }
  ingredientsLen(): number {
    return (this.formRecipe.get('ingredients')?.value || '').length;
  }
  recipeLen(): number {
    return (this.formRecipe.get('recipe')?.value || '').length;
  }
}
