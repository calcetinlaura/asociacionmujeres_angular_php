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
import { MoviesFacade } from 'src/app/application';
import { MovieModel } from 'src/app/core/interfaces/movie.interface';
import { filterMovies } from 'src/app/core/models/general.model';
import { MoviesService } from 'src/app/core/services/movies.services';
import { GeneralService } from 'src/app/shared/services/generalService.service';

@Component({
  selector: 'app-form-movie',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, EditorModule, MatCardModule],
  templateUrl: './form-movie.component.html',
  styleUrls: ['../../../../components/form/form.component.css'],
  providers: [MoviesService],
})
export class FormMovieComponent {
  private moviesFacade = inject(MoviesFacade);
  private generalService = inject(GeneralService);

  @Input() itemId!: number;
  @Output() sendFormMovie = new EventEmitter<MovieModel>();

  movieData: any;
  imageSrc: string = '';
  errorSession: boolean = false;
  submitted: boolean = false;
  titleForm: string = 'Registrar película';
  buttonAction: string = 'Guardar';
  years: number[] = [];
  FilterMovies = filterMovies;

  formMovie = new FormGroup({
    title: new FormControl('', [Validators.required]),
    director: new FormControl('', [Validators.required]),
    description: new FormControl('', [Validators.maxLength(2000)]),
    gender: new FormControl('', [Validators.required]),
    img: new FormControl(''),
    year: new FormControl(0, [Validators.required]),
  });

  ngOnInit(): void {
    const currentYear = this.generalService.currentYear;
    this.years = this.generalService.loadYears(currentYear, 2018);

    if (this.itemId) {
      this.moviesFacade.loadMovieById(this.itemId);
      this.moviesFacade.selectedMovie$
        .pipe(
          filter((movie: MovieModel | null) => movie !== null),
          tap((movie: MovieModel | null) => {
            if (movie) {
              this.formMovie.patchValue(movie);
              this.titleForm = 'Editar Película';
              this.buttonAction = 'Guardar cambios';
            }
          })
        )
        .subscribe();
    }
  }

  onSendFormMovie(): void {
    if (this.formMovie.invalid) {
      this.submitted = true;
      return;
    }

    const formValue: MovieModel = {
      title: this.formMovie.get('title')?.value || '',
      director: this.formMovie.get('director')?.value || '',
      description: this.formMovie.get('description')?.value || '',
      gender: this.formMovie.get('gender')?.value || '',
      img: this.formMovie.get('img')?.value || '',
      year: this.formMovie.get('year')?.value || 0,
    };
    this.sendFormMovie.emit(formValue);
  }
}
