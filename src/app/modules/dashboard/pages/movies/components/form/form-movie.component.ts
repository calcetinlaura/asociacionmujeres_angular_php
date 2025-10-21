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
import { ImageControlComponent } from 'src/app/modules/dashboard/components/image-control/image-control.component';
import { SpinnerLoadingComponent } from 'src/app/shared/components/spinner-loading/spinner-loading.component';
import { ScrollToFirstErrorDirective } from 'src/app/shared/directives/scroll-to-first-error.directive';
import { GeneralService } from 'src/app/shared/services/generalService.service';

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
  styleUrls: ['../../../../components/form/form.component.css'],
})
export class FormMovieComponent {
  private moviesFacade = inject(MoviesFacade);
  private destroyRef = inject(DestroyRef);
  private generalService = inject(GeneralService);
  @Input() itemId!: number;
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
  movieData: any;
  imageSrc: string = '';
  submitted = false;
  titleForm: string = 'Registrar película';
  buttonAction: string = 'Guardar';
  years: number[] = [];
  genderMovies = genderFilterMovies;
  typeList = TypeList.Movies;

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
      this.moviesFacade.loadMovieById(this.itemId);
      this.moviesFacade.selectedMovie$
        .pipe(
          takeUntilDestroyed(this.destroyRef),
          filter((movie: MovieModel | null) => movie !== null),
          tap((movie: MovieModel | null) => {
            if (movie) {
              this.formMovie.patchValue({
                title: movie.title || null,
                director: movie.director || null,
                description: movie.description || null,
                summary: movie.summary || null,
                gender: movie.gender || null,
                img: movie.img || null,
                year: movie.year || 0,
              });

              this.titleForm = 'Editar Película';
              this.buttonAction = 'Guardar cambios';
              if (movie.img) {
                this.imageSrc = movie.img;
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
      {
        img: this.selectedImageFile,
      },
      this.itemId
    );

    this.submitForm.emit({ itemId: this.itemId, formData: formData });
  }
  summaryDescription(): number {
    return (this.formMovie.get('description')?.value || '').length;
  }
  summaryLen(): number {
    return (this.formMovie.get('summary')?.value || '').length;
  }
}
