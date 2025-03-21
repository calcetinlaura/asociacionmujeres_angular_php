import { CommonModule } from '@angular/common';
import { Component, EventEmitter, inject, Input, Output } from '@angular/core';
import {
  FormControl,
  FormGroup,
  ReactiveFormsModule,
  Validators,
} from '@angular/forms';
import { MatCardModule } from '@angular/material/card';
import { EditorModule } from '@tinymce/tinymce-angular';
import { filter, tap } from 'rxjs';
import { BooksFacade } from 'src/app/application';
import {
  BookModel,
  GenderBooks,
  GenderFilterBooks,
} from 'src/app/core/interfaces/book.interface';
import { filterBooks, TypeList } from 'src/app/core/models/general.model';
import { ImageControlComponent } from 'src/app/modules/dashboard/components/image-control/image-control.component';
import { GeneralService } from 'src/app/shared/services/generalService.service';

@Component({
  selector: 'app-form-book',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    EditorModule,
    MatCardModule,
    ImageControlComponent,
  ],
  templateUrl: './form-book.component.html',
  styleUrls: ['../../../../components/form/form.component.css'],
})
export class FormBookComponent {
  private booksFacade = inject(BooksFacade);
  private generalService = inject(GeneralService);

  @Input() itemId!: number;
  @Output() sendFormBook = new EventEmitter<{
    itemId: number;
    newBookData: FormData;
  }>();
  selectedImageFile: File | null = null;
  bookData: any;
  imageSrc: string = '';
  errorSession: boolean = false;
  submitted: boolean = false;
  titleForm: string = 'Registrar libro';
  buttonAction: string = 'Guardar';
  years: number[] = [];
  genderBooks = GenderFilterBooks;
  typeList = TypeList.Books;
  formBook = new FormGroup({
    title: new FormControl('', [Validators.required]),
    author: new FormControl(''),
    description: new FormControl('', [Validators.maxLength(2000)]),
    gender: new FormControl('', [Validators.required]),
    img: new FormControl(''),
    year: new FormControl(0, [Validators.required, Validators.min(2000)]),
  });

  ngOnInit(): void {
    const currentYear = this.generalService.currentYear;
    this.years = this.generalService.loadYears(currentYear, 2018);

    if (this.itemId) {
      this.booksFacade.loadBookById(this.itemId);
      this.booksFacade.selectedBook$
        .pipe(
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

    const formData = this.generalService.createFormData(
      this.formBook.value,
      this.selectedImageFile,
      this.itemId
    );

    this.sendFormBook.emit({ itemId: this.itemId, newBookData: formData });
  }
}
