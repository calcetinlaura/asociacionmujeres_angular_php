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
import { BooksFacade } from 'src/app/application/books.facade';
import {
  BookModel,
  genderFilterBooks,
} from 'src/app/core/interfaces/book.interface';
import { TypeList } from 'src/app/core/models/general.model';
import { GeneralService } from 'src/app/core/services/generalService.service';
import { ImageControlComponent } from 'src/app/shared/components/image-control/image-control.component';
import { SpinnerLoadingComponent } from 'src/app/shared/components/spinner-loading/spinner-loading.component';
import { ScrollToFirstErrorDirective } from 'src/app/shared/directives/scroll-to-first-error.directive';

@Component({
  selector: 'app-form-book',
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatCardModule,
    ImageControlComponent,
    QuillModule,
    SpinnerLoadingComponent,
    ScrollToFirstErrorDirective,
  ],
  templateUrl: './form-book.component.html',
  styleUrls: ['./../../../../../../shared/components/form/form.component.css'],
})
export class FormBookComponent {
  readonly booksFacade = inject(BooksFacade);
  private readonly destroyRef = inject(DestroyRef);
  private readonly generalService = inject(GeneralService);

  @Input() itemId!: number;
  @Input() item: BookModel | null = null;
  @Output() submitForm = new EventEmitter<{
    itemId: number;
    formData: FormData;
  }>();

  formBook = new FormGroup({
    title: new FormControl('', [Validators.required]),
    author: new FormControl(''),
    description: new FormControl('', [Validators.maxLength(2000)]),
    summary: new FormControl('', [Validators.maxLength(300)]),
    gender: new FormControl('', [Validators.required]),
    img: new FormControl(''),
    year: new FormControl<number | null>(null, [
      Validators.required,
      Validators.min(2000),
    ]),
  });

  selectedImageFile: File | null = null;
  bookData: any;
  imageSrc: string = '';
  submitted = false;
  titleForm: string = 'Registrar libro';
  buttonAction: string = 'Guardar';
  years: number[] = [];
  genderBooks = genderFilterBooks;
  typeList = TypeList.Books;

  currentYear = this.generalService.currentYear;
  quillModules = this.generalService.defaultQuillModules;
  ngOnInit(): void {
    this.years = this.generalService.loadYears(this.currentYear, 2018);

    // ✅ Caso 1: si el item completo ya llega desde la modal
    if (this.item) {
      this.patchForm(this.item);
      return;
    }

    // ✅ Caso 2: si solo tenemos el id (modo carga asíncrona desde backend)
    if (this.itemId) {
      this.booksFacade.loadBookById(this.itemId);
      this.booksFacade.selectedBook$
        .pipe(
          takeUntilDestroyed(this.destroyRef),
          filter((book: BookModel | null) => book !== null),
          tap((book: BookModel | null) => {
            if (book) {
              this.patchForm(book);
            }
          })
        )
        .subscribe();
    }
  }
  private patchForm(book: BookModel) {
    this.formBook.patchValue({
      title: book.title || '',
      author: book.author || '',
      description: book.description || '',
      summary: book.summary || '',
      gender: book.gender || '',
      img: book.img || '',
      year: book.year || null,
    });

    this.titleForm = 'Editar Libro';
    this.buttonAction = 'Guardar cambios';

    if (book.img) {
      this.imageSrc = book.img;
      this.selectedImageFile = null;
    }
  }
  async onImageSelected(file: File) {
    const result = await this.generalService.handleFileSelection(file);
    this.selectedImageFile = result.file;
    this.imageSrc = result.imageSrc;
  }

  onSendFormBook(): void {
    if (this.formBook.invalid) {
      this.submitted = true;
      console.log('Formulario inválido', this.formBook.errors);
      return;
    }

    const rawValues = { ...this.formBook.getRawValue() } as any;

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

    this.submitForm.emit({ itemId: this.itemId, formData: formData });
  }
  descriptionLen(): number {
    return (this.formBook.get('description')?.value || '').length;
  }
  summaryLen(): number {
    return (this.formBook.get('summary')?.value || '').length;
  }
}
