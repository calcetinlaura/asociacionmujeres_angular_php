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
import { catchError, filter, tap } from 'rxjs';
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
    // imgFile: new FormControl(null),
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
                // imgFile: null, // Since we're not directly passing the file here
                year: book.year || null,
              });

              this.titleForm = 'Editar Libro';
              this.buttonAction = 'Guardar cambios';
              if (book.img) {
                this.imageSrc = book.img; // Save the image URL
                this.selectedImageFile = null; // Ensure no file reference is made
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
    const formData = new FormData();

    // Agrega todos los campos del formulario al FormData
    formData.append('title', this.formBook.get('title')?.value || '');
    formData.append('author', this.formBook.get('author')?.value || '');
    formData.append(
      'description',
      this.formBook.get('description')?.value || ''
    );
    formData.append('gender', this.formBook.get('gender')?.value || '');
    formData.append('year', (this.formBook.get('year')?.value || 0).toString());

    // Si hay una imagen seleccionada, agrégala al FormData
    if (this.selectedImageFile) {
      formData.append('img', this.selectedImageFile); // Aquí se agrega el archivo de imagen
    }
    for (const [key, value] of formData as any) {
      if (value instanceof File) {
        console.log(`${key}: ${value.name} (${value.size} bytes)`); // Log filename and size
      } else {
        console.log(`${key}: ${value}`);
      }
    }
    console.log('ID', this.itemId);
    // Llama al servicio para subir el libro (incluyendo la imagen)
    if (this.itemId) {
      console.log('FormData values:', {
        title: this.formBook.get('title')?.value,
        author: this.formBook.get('author')?.value,
        description: this.formBook.get('description')?.value,
        gender: this.formBook.get('gender')?.value,
        year: this.formBook.get('year')?.value,
        selectedImageFile: this.selectedImageFile,
      });
      this.booksFacade
        .editBook(this.itemId, formData)
        .pipe(
          catchError((error: any) => {
            console.error('Error en la solicitud de LIBROS:', error);
            throw error;
          })
        )
        .subscribe();
    } else {
      this.booksFacade.addBook(formData).subscribe(
        (response) => {
          console.log('Libro subido exitosamente', response);
          this.sendFormBook.emit(response); // O maneja la respuesta como desees
        },
        (error) => {
          console.error('Error al subir el libro', error);
          // Aquí puedes manejar errores, como mostrar un mensaje al usuario
        }
      );
    }
  }
  onFileSelected(file: File) {
    this.selectedImageFile = file; // Guarda el archivo seleccionado
    console.log('Selected file:', file);
  }
}
