import { CommonModule } from '@angular/common';
import {
  Component,
  DestroyRef,
  EventEmitter,
  inject,
  Input,
  OnInit,
  Output,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
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
import { GeneralService } from 'src/app/core/services/generalService.service';

import { ImageControlComponent } from 'src/app/shared/components/image-control/image-control.component';
import { SpinnerLoadingComponent } from 'src/app/shared/components/spinner-loading/spinner-loading.component';
import { ScrollToFirstErrorDirective } from 'src/app/shared/directives/scroll-to-first-error.directive';

@Component({
  selector: 'app-form-recipe',
  standalone: true,
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
export class FormRecipeComponent implements OnInit {
  readonly recipesFacade = inject(RecipesFacade);
  private readonly generalService = inject(GeneralService);
  private readonly destroyRef = inject(DestroyRef);

  @Input() itemId!: number;
  @Input() item: RecipeModel | null = null;
  @Output() submitForm = new EventEmitter<{
    itemId: number;
    formData: FormData;
  }>();

  // ────────────────────────────────────────────────────────────────
  // Estado general
  // ────────────────────────────────────────────────────────────────
  selectedImageFile: File | null = null;
  imageSrc = '';
  submitted = false;
  titleForm = 'Registrar receta';
  buttonAction = 'Guardar';
  typeList = TypeList.Recipes;
  FilterRecipes = categoryFilterRecipes;
  years: number[] = [];
  currentYear = this.generalService.currentYear;

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

  quillModules = this.generalService.defaultQuillModules;

  // ────────────────────────────────────────────────────────────────
  // Lifecycle
  // ────────────────────────────────────────────────────────────────
  ngOnInit(): void {
    this.years = this.generalService.loadYears(this.currentYear, 2018);

    if (this.item) {
      this.patchForm(this.item);
      return;
    }

    if (this.itemId) {
      this.recipesFacade.loadRecipeById(this.itemId);
      this.recipesFacade.selectedRecipe$
        .pipe(
          takeUntilDestroyed(this.destroyRef),
          filter((recipe): recipe is RecipeModel => !!recipe),
          tap((recipe) => this.patchForm(recipe))
        )
        .subscribe();
    }
  }

  // ────────────────────────────────────────────────────────────────
  // Patching del formulario
  // ────────────────────────────────────────────────────────────────
  private patchForm(recipe: RecipeModel): void {
    this.formRecipe.patchValue({
      title: recipe.title ?? '',
      category: recipe.category ?? '',
      owner: recipe.owner ?? '',
      summary: recipe.summary ?? '',
      introduction: recipe.introduction ?? '',
      recipe: recipe.recipe ?? '',
      ingredients: recipe.ingredients ?? '',
      img: recipe.img ?? '',
      year: recipe.year ?? null,
    });

    this.titleForm = 'Editar receta';
    this.buttonAction = 'Guardar cambios';

    if (recipe.img) {
      this.imageSrc = recipe.img;
      this.selectedImageFile = null;
    }
  }

  // ────────────────────────────────────────────────────────────────
  // Imagen
  // ────────────────────────────────────────────────────────────────
  async onImageSelected(file: File): Promise<void> {
    const result = await this.generalService.handleFileSelection(file);
    this.selectedImageFile = result.file;
    this.imageSrc = result.imageSrc;
  }

  // ────────────────────────────────────────────────────────────────
  // Envío
  // ────────────────────────────────────────────────────────────────
  onSendFormRecipe(): void {
    if (this.formRecipe.invalid) {
      this.submitted = true;
      this.formRecipe.markAllAsTouched();
      return;
    }

    const rawValues = { ...this.formRecipe.getRawValue() };
    const values = rawValues as Record<string, any>; // ✅ permite indexar por string

    ['introduction', 'ingredients', 'recipe'].forEach((field) => {
      if (values[field]) {
        values[field] = values[field].replace(/&nbsp;/g, ' ');
      }
    });

    const formData = this.generalService.createFormData(
      rawValues,
      { img: this.selectedImageFile },
      this.itemId
    );

    if (this.imageSrc && !this.selectedImageFile)
      formData.append('existingImg', this.imageSrc);

    this.submitForm.emit({ itemId: this.itemId, formData });
  }

  // ────────────────────────────────────────────────────────────────
  // Utilidades
  // ────────────────────────────────────────────────────────────────
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
