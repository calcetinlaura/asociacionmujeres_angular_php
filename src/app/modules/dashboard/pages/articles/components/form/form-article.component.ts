import { CommonModule } from '@angular/common';
import {
  Component,
  DestroyRef,
  EventEmitter,
  inject,
  Input,
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

import { ArticlesFacade } from 'src/app/application/articles.facade';
import { ArticleModel } from 'src/app/core/interfaces/article.interface';
import { TypeList } from 'src/app/core/models/general.model';
import { GeneralService } from 'src/app/core/services/generalService.service';
import { ImageControlComponent } from 'src/app/shared/components/image-control/image-control.component';
import { SpinnerLoadingComponent } from 'src/app/shared/components/spinner-loading/spinner-loading.component';
import { ScrollToFirstErrorDirective } from 'src/app/shared/directives/scroll-to-first-error.directive';

@Component({
  selector: 'app-form-article',
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatCardModule,
    ImageControlComponent,
    QuillModule,
    SpinnerLoadingComponent,
    ScrollToFirstErrorDirective,
  ],
  templateUrl: './form-article.component.html',
  styleUrls: ['./../../../../../../shared/components/form/form.component.css'],
})
export class FormArticleComponent {
  readonly articlesFacade = inject(ArticlesFacade);
  private readonly destroyRef = inject(DestroyRef);
  private readonly generalService = inject(GeneralService);

  @Input() itemId!: number;
  @Input() item: ArticleModel | null = null;

  @Output() submitForm = new EventEmitter<{
    itemId: number;
    formData: FormData;
  }>();

  formArticle = new FormGroup({
    title: new FormControl('', [Validators.required]),
    date: new FormControl('', [Validators.required]),
    description: new FormControl('', [Validators.maxLength(2000)]),
    summary: new FormControl('', [Validators.maxLength(300)]),
    img: new FormControl(''),
  });

  selectedImageFile: File | null = null;
  imageSrc = '';
  submitted = false;
  titleForm = 'Registrar artículo';
  buttonAction = 'Guardar';
  typeList = TypeList.Articles;

  quillModules = this.generalService.defaultQuillModules;

  ngOnInit(): void {
    // ✅ Caso 1: el artículo completo ya llega desde la modal
    if (this.item) {
      this.patchForm(this.item);
      return;
    }

    // ✅ Caso 2: carga asíncrona desde backend por ID
    if (this.itemId) {
      this.articlesFacade.loadArticleById(this.itemId);
      this.articlesFacade.selectedArticle$
        .pipe(
          takeUntilDestroyed(this.destroyRef),
          filter(
            (article: ArticleModel | null): article is ArticleModel => !!article
          ),
          tap((article) => {
            this.patchForm(article);
          })
        )
        .subscribe();
    }
  }

  private patchForm(article: ArticleModel) {
    this.formArticle.patchValue({
      title: article.title || '',
      date: article.date || '',
      description: article.description || '',
      summary: article.summary || '',
      img: article.img || '',
    });

    this.titleForm = 'Editar artículo';
    this.buttonAction = 'Guardar cambios';

    if (article.img) {
      this.imageSrc = article.img;
      this.selectedImageFile = null;
    }
  }

  async onImageSelected(file: File) {
    const result = await this.generalService.handleFileSelection(file);
    this.selectedImageFile = result.file;
    this.imageSrc = result.imageSrc;
  }

  onSendFormArticle(): void {
    if (this.formArticle.invalid) {
      this.submitted = true;
      console.log('Formulario inválido', this.formArticle.errors);
      return;
    }

    const rawValues = { ...this.formArticle.getRawValue() } as any;
    if (rawValues.description) {
      rawValues.description = rawValues.description.replace(/&nbsp;/g, ' ');
    }

    const formData = this.generalService.createFormData(
      rawValues,
      { img: this.selectedImageFile },
      this.itemId
    );

    this.submitForm.emit({ itemId: this.itemId, formData });
  }

  descriptionLen(): number {
    return (this.formArticle.get('description')?.value || '').length;
  }

  summaryLen(): number {
    return (this.formArticle.get('summary')?.value || '').length;
  }
}
