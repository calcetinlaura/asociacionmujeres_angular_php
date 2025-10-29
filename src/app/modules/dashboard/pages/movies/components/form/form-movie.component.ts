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

import { MoviesFacade } from 'src/app/application/movies.facade';
import {
  genderFilterMovies,
  MovieModel,
} from 'src/app/core/interfaces/movie.interface';
import { TypeList } from 'src/app/core/models/general.model';
import { GeneralService } from 'src/app/core/services/generalService.service';
import { ImageControlComponent } from 'src/app/shared/components/image-control/image-control.component';
import { SpinnerLoadingComponent } from 'src/app/shared/components/spinner-loading/spinner-loading.component';
import { ScrollToFirstErrorDirective } from 'src/app/shared/directives/scroll-to-first-error.directive';

@Component({
  selector: 'app-form-movie',
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatCardModule,
    ImageControlComponent,
    QuillModule,
    SpinnerLoadingComponent,
    ScrollToFirstErrorDirective,
  ],
  templateUrl: './form-movie.component.html',
  styleUrls: ['./../../../../../../shared/components/form/form.component.css'],
})
export class FormMovieComponent {
  readonly moviesFacade = inject(MoviesFacade);
  private readonly destroyRef = inject(DestroyRef);
  private readonly generalService = inject(GeneralService);

  @Input() itemId!: number;
  @Input() item: MovieModel | null = null;

  @Output() submitForm = new EventEmitter<{
    itemId: number;
    formData: FormData;
  }>();

  formMovie = new FormGroup({
    title: new FormControl('', [Validators.required]),
    director: new FormControl(''),
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
  imageSrc = '';
  submitted = false;

  titleForm = 'Registrar película';
  buttonAction = 'Guardar';

  years: number[] = [];
  genderMovies = genderFilterMovies;
  typeList = TypeList.Movies;

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
      this.moviesFacade.loadMovieById(this.itemId);
      this.moviesFacade.selectedMovie$
        .pipe(
          takeUntilDestroyed(this.destroyRef),
          filter((movie: MovieModel | null) => movie !== null),
          tap((movie: MovieModel | null) => {
            if (movie) {
              this.patchForm(movie);
            }
          })
        )
        .subscribe();
    }
  }

  private patchForm(movie: MovieModel) {
    this.formMovie.patchValue({
      title: movie.title || '',
      director: movie.director || '',
      description: movie.description || '',
      summary: movie.summary || '',
      gender: movie.gender || '',
      img: movie.img || '',
      year: movie.year ?? null,
    });

    this.titleForm = 'Editar Película';
    this.buttonAction = 'Guardar cambios';

    if (movie.img) {
      this.imageSrc = movie.img;
      this.selectedImageFile = null;
    }
  }

  async onImageSelected(file: File) {
    const result = await this.generalService.handleFileSelection(file);
    this.selectedImageFile = result.file;
    this.imageSrc = result.imageSrc;
  }

  onSendFormMovie(): void {
    if (this.formMovie.invalid) {
      this.submitted = true;
      console.log('Formulario inválido', this.formMovie.errors);
      return;
    }

    const rawValues = { ...this.formMovie.getRawValue() } as any;

    if (rawValues.description) {
      rawValues.description = rawValues.description.replace(/&nbsp;/g, ' ');
    }

    const formData = this.generalService.createFormData(
      rawValues,
      { img: this.selectedImageFile },
      this.itemId
    );

    this.submitForm.emit({ itemId: this.itemId, formData });

    // ⬇️ Opcional: si quieres cerrar/volver automáticamente al enviar.
    // (Recomendado hacerlo en el padre tras confirmar éxito del backend)
    // this.modalFacade.back();   // vuelve a la modal anterior de la pila
    // this.modalFacade.close();  // cierra completamente la modal
  }

  // Accesos rápidos para contadores de caracteres
  descriptionLen(): number {
    return (this.formMovie.get('description')?.value || '').length;
  }
  summaryLen(): number {
    return (this.formMovie.get('summary')?.value || '').length;
  }
}
