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
import { ImageControlComponent } from 'src/app/modules/dashboard/components/image-control/image-control.component';
import { SpinnerLoadingComponent } from 'src/app/shared/components/spinner-loading/spinner-loading.component';
import { ScrollToFirstErrorDirective } from 'src/app/shared/directives/scroll-to-first-error.directive';
import { GeneralService } from 'src/app/shared/services/generalService.service';

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
  styleUrls: ['../../../../components/form/form.component.css'],
})
export class FormArticleComponent {
  private articlesFacade = inject(ArticlesFacade);
  private destroyRef = inject(DestroyRef);
  private generalService = inject(GeneralService);

  @Input() itemId!: number;
  @Output() submitForm = new EventEmitter<{
    itemId: number;
    formData: FormData;
  }>();

  formArticle = new FormGroup({
    title: new FormControl('', [Validators.required]),
    date: new FormControl('', [Validators.required]),
    description: new FormControl('', [Validators.maxLength(2000)]),
    img: new FormControl(''),
  });

  selectedImageFile: File | null = null;
  imageSrc = '';
  submitted = false;
  titleForm = 'Registrar artículo';
  buttonAction = 'Guardar';
  typeList = TypeList.Articles;
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
    if (this.itemId) {
      this.articlesFacade.loadArticleById(this.itemId);
      this.articlesFacade.selectedArticle$
        .pipe(
          takeUntilDestroyed(this.destroyRef),
          filter((a): a is ArticleModel => !!a),
          tap((article: ArticleModel | null) => {
            if (article) {
              this.formArticle.patchValue({
                title: article.title || null,
                date: article.date || null,
                description: article.description || null,
                img: article.img || null,
              });

              this.titleForm = 'Editar artículo';
              this.buttonAction = 'Guardar cambios';

              if (article.img) {
                this.imageSrc = article.img;
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
      {
        img: this.selectedImageFile,
      },
      this.itemId
    );

    this.submitForm.emit({
      itemId: this.itemId,
      formData,
    });
  }
}
