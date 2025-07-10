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

import { filter, tap } from 'rxjs';
import { BooksFacade } from 'src/app/application/books.facade';
import {
  BookModel,
  genderFilterBooks,
} from 'src/app/core/interfaces/book.interface';
import { TypeList } from 'src/app/core/models/general.model';
import { ImageControlComponent } from 'src/app/modules/dashboard/components/image-control/image-control.component';
import { GeneralService } from 'src/app/shared/services/generalService.service';

@Component({
    selector: 'app-form-book',
    imports: [
        CommonModule,
        ReactiveFormsModule,
        MatCardModule,
        ImageControlComponent,
    ],
    templateUrl: './form-book.component.html',
    styleUrls: ['../../../../components/form/form.component.css']
})
export class FormBookComponent {
  private booksFacade = inject(BooksFacade);
  private destroyRef = inject(DestroyRef);
  private generalService = inject(GeneralService);

  @Input() itemId!: number;
  @Output() sendFormBook = new EventEmitter<{
    itemId: number;
    formData: FormData;
  }>();

  formBook = new FormGroup({
    title: new FormControl('', [Validators.required]),
    author: new FormControl(''),
    description: new FormControl('', [Validators.maxLength(2000)]),
    gender: new FormControl('', [Validators.required]),
    img: new FormControl(''),
    year: new FormControl<number | null>(null, [
      Validators.required,
      Validators.min(2000),
    ]),
  });

  selectedImageFile: File | null = null;
  bookData: any;
  imageSrc = '';
  errorSession = false;
  submitted = false;
  titleForm: string = 'Registrar libro';
  buttonAction: string = 'Guardar';
  years: number[] = [];
  genderBooks = genderFilterBooks;
  typeList = TypeList.Books;

  currentYear = this.generalService.currentYear;

  ngOnInit(): void {
    this.years = this.generalService.loadYears(this.currentYear, 2018);

    if (this.itemId) {
      this.booksFacade.loadBookById(this.itemId);
      this.booksFacade.selectedBook$
        .pipe(
          takeUntilDestroyed(this.destroyRef),
          filter((book: BookModel | null) => book !== null),
          tap((book: BookModel | null) => {
            if (book) {
              this.formBook.patchValue({
                title: book.title || null,
                author: book.author || null,
                description: book.description || null,
                gender: book.gender || null,
                img: book.img || null,
                year: book.year || 0,
              });

              this.titleForm = 'Editar Libro';
              this.buttonAction = 'Guardar cambios';

              if (book.img) {
                this.imageSrc = book.img;
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

  onSendFormBook(): void {
    if (this.formBook.invalid) {
      this.submitted = true;
      console.log('Formulario inválido', this.formBook.errors);
      return;
    }

    const rawValues = { ...this.formBook.getRawValue() } as any;

    const formData = this.generalService.createFormData(
      rawValues,
      {
        img: this.selectedImageFile,
      },
      this.itemId
    );

    this.sendFormBook.emit({ itemId: this.itemId, formData: formData });
  }
}
