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
import { MoviesFacade } from 'src/app/application/movies.facade';
import {
  genderFilterMovies,
  MovieModel,
} from 'src/app/core/interfaces/movie.interface';
import { TypeList } from 'src/app/core/models/general.model';
import { ImageControlComponent } from 'src/app/modules/dashboard/components/image-control/image-control.component';
import { GeneralService } from 'src/app/shared/services/generalService.service';

@Component({
  selector: 'app-form-movie',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    EditorModule,
    MatCardModule,
    ImageControlComponent,
  ],
  templateUrl: './form-movie.component.html',
  styleUrls: ['../../../../components/form/form.component.css'],
})
export class FormMovieComponent {
  private moviesFacade = inject(MoviesFacade);
  private generalService = inject(GeneralService);
  @Input() itemId!: number;
  @Output() sendFormMovie = new EventEmitter<{
    itemId: number;
    newMovieData: FormData;
  }>();
  selectedImageFile: File | null = null;
  movieData: any;
  imageSrc: string = '';
  errorSession: boolean = false;
  submitted: boolean = false;
  titleForm: string = 'Registrar película';
  buttonAction: string = 'Guardar';
  years: number[] = [];
  genderMovies = genderFilterMovies;
  typeList = TypeList.Movies;
  formMovie = new FormGroup({
    title: new FormControl('', [Validators.required]),
    director: new FormControl(''),
    description: new FormControl('', [Validators.maxLength(2000)]),
    gender: new FormControl('', [Validators.required]),
    img: new FormControl(''),
    year: new FormControl(0, [Validators.required, Validators.min(2000)]),
  });
  currentYear = this.generalService.currentYear;

  ngOnInit(): void {
    this.years = this.generalService.loadYears(this.currentYear, 2018);

    if (this.itemId) {
      this.moviesFacade.loadMovieById(this.itemId);
      this.moviesFacade.selectedMovie$
        .pipe(
          filter((movie: MovieModel | null) => movie !== null),
          tap((movie: MovieModel | null) => {
            if (movie) {
              this.formMovie.patchValue({
                title: movie.title || null,
                director: movie.director || null,
                description: movie.description || null,
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

  onSendFormMovie(): void {
    if (this.formMovie.invalid) {
      this.submitted = true;
      console.log('Formulario inválido', this.formMovie.errors);
      return;
    }

    const formData = this.generalService.createFormData(
      this.formMovie.value,
      this.selectedImageFile,
      this.itemId
    );

    this.sendFormMovie.emit({ itemId: this.itemId, newMovieData: formData });
  }
}
