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
import { EditorModule } from '@tinymce/tinymce-angular';
import { filter, tap } from 'rxjs';
import { BooksFacade } from 'src/app/application';
import { BookModel } from 'src/app/core/interfaces/book.interface';
import { filterBooks, TypeList } from 'src/app/core/models/general.model';
import { ImageControlComponent } from '../../../../components/image-control/image-control.component';
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
  private destroyRef = inject(DestroyRef);

  @Input() itemId!: number;
  @Output() sendFormBook = new EventEmitter<BookModel>();
  selectedImageFile: File | null = null;

  bookData: any;
  imageSrc: string = '';
  errorSession: boolean = false;
  submitted: boolean = false;
  titleForm: string = 'Registrar libro';
  buttonAction: string = 'Guardar';
  years: number[] = [];
  FilterBooks = filterBooks;
  typeList = TypeList.Books;
  formBook = new FormGroup({
    title: new FormControl('', [Validators.required]),
    author: new FormControl('', [Validators.required]),
    description: new FormControl('', [Validators.maxLength(2000)]),
    gender: new FormControl('', [Validators.required]),
    img: new FormControl(''),
    imgFile: new FormControl<File | null>(null),
    year: new FormControl(0, [Validators.required]),
  });

  ngOnInit(): void {
    const currentYear = this.generalService.currentYear;
    this.years = this.generalService.loadYears(currentYear, 2018);

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
                // imgFile: book.imgFil || null,
                year: book.year || 0,
              });

              this.titleForm = 'Editar Libro';
              this.buttonAction = 'Guardar cambios';
              console.log('IMAGEN ONINIT', book, this.imageSrc);
              if (book.img) {
                this.imageSrc = book.img;
                console.log('IMAGEN ONINIT', this.imageSrc);
                this.selectedImageFile = null;
              }
            }
          })
        )
        .subscribe();
    }
  }

  onSendFormBook(): void {
    // Verifica si el formulario es inválido
    if (this.formBook.invalid) {
      this.submitted = true;
      console.log('Formulario invalido');
      return;
    }

    // Crea un nuevo objeto FormData
    const formValue: BookModel = {
      title: this.formBook.get('title')?.value || '',
      author: this.formBook.get('author')?.value || '',
      description: this.formBook.get('description')?.value || '',
      gender: this.formBook.get('gender')?.value || '',
      year: this.formBook.get('year')?.value || 0,
      img: this.selectedImageFile?.name || 'null',
      // imgFile: this.selectedImageFile || 'null',
    };
    this.sendFormBook.emit(formValue);
  }
  onFileSelected(file: File) {
    this.selectedImageFile = file; // Guarda el archivo seleccionado
    if (file) {
      const reader = new FileReader();
      reader.onload = (e) => {
        this.imageSrc = e.target?.result as string; // Set the imageSrc to a base64 URL
      };
      reader.readAsDataURL(file); // Reading the file as a Data URL
    } else {
      this.imageSrc = ''; // Reset if no file
    }

    console.log('Selected file:', file);
  }
}
