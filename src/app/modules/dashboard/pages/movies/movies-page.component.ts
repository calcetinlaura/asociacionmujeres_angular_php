import {
  Component,
  DestroyRef,
  ElementRef,
  HostListener,
  inject,
  OnInit,
  ViewChild,
} from '@angular/core';
import { DashboardHeaderComponent } from 'src/app/modules/dashboard/components/dashboard-header/dashboard-header.component';
import { TypeActionModal, TypeList } from 'src/app/core/models/general.model';
import { ColumnModel } from 'src/app/core/interfaces/column.interface';
import { MoviesService } from 'src/app/core/services/movies.services';
import { TableComponent } from 'src/app/modules/dashboard/components/table/table.component';
import { ModalComponent } from 'src/app/shared/components/modal/modal.component';
import { CommonModule } from '@angular/common';
import { MoviesFacade } from 'src/app/application';
import { FormControl, FormGroup, ReactiveFormsModule } from '@angular/forms';
import { ModalService } from 'src/app/shared/components/modal/services/modal.service';
import { tap } from 'rxjs';
import { AddButtonComponent } from 'src/app/shared/components/buttons/button-add/button-add.component';
import { InputSearchComponent } from 'src/app/shared/components/inputs/input-search/input-search.component';
import { MovieModel } from 'src/app/core/interfaces/movie.interface';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { SpinnerLoadingComponent } from '../../../landing/components/spinner-loading/spinner-loading.component';

@Component({
  selector: 'app-movies-page',
  standalone: true,
  imports: [
    CommonModule,
    DashboardHeaderComponent,
    TableComponent,
    ModalComponent,
    AddButtonComponent,
    ReactiveFormsModule,
    InputSearchComponent,
    SpinnerLoadingComponent,
  ],
  providers: [MoviesService],
  templateUrl: './movies-page.component.html',
  styleUrl: './movies-page.component.css',
})
export class MoviesPageComponent implements OnInit {
  private moviesFacade = inject(MoviesFacade);
  private modalService = inject(ModalService);
  private destroyRef = inject(DestroyRef);

  typeList = TypeList.Movies;
  movies: MovieModel[] = [];
  filteredMovies: MovieModel[] = [];
  searchForm!: FormGroup;
  dataLoaded: boolean = false;
  number: number = 0;
  headerListMovies: ColumnModel[] = [];
  isModalVisible: boolean = false;
  currentModalAction: TypeActionModal = TypeActionModal.Create;
  item: any;
  searchKeywordFilter = new FormControl();
  isStickyToolbar: boolean = false;

  @ViewChild('toolbar') toolbar!: ElementRef;

  @HostListener('window:scroll', [])
  onWindowScroll() {
    const scrollPosition =
      window.scrollY ||
      document.documentElement.scrollTop ||
      document.body.scrollTop ||
      0;

    // Hacer sticky la toolbar al hacer scroll más de 300px (justo después de la cabecera)
    if (scrollPosition > 50) {
      this.isStickyToolbar = true;
    } else {
      this.isStickyToolbar = false;
    }
  }

  ngOnInit(): void {
    this.loadAllMovies();

    // Suscripción a los cambios de visibilidad del modal
    this.modalService.modalVisibility$
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        tap((isVisible) => {
          this.isModalVisible = isVisible;
        })
      )
      .subscribe();

    this.headerListMovies = [
      { title: 'Título', key: 'title' },
      { title: 'Director/a', key: 'director' },
      { title: 'Descripción', key: 'description' },
      { title: 'Género', key: 'gender' },
      { title: 'Portada', key: 'img' },
      { title: 'Año compra', key: 'year' },
    ];
  }

  loadAllMovies(): void {
    this.moviesFacade.loadAllMovies();
    this.moviesFacade.movies$
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        tap((movies) => {
          if (movies === null) {
            return;
          }
          this.movies = movies;
          this.filteredMovies = movies;
          this.number = this.movies.length;
          this.dataLoaded = true;
        })
      )
      .subscribe();
  }

  applyFilter(keyword: string): void {
    this.moviesFacade.applyFilter(keyword);
    this.moviesFacade.filteredMovies$
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        tap((movies) => {
          this.updateMovieState(movies);
        })
      )
      .subscribe();
  }

  confirmDeleteMovie(item: any): void {
    this.moviesFacade.deleteMovie(item.id);
    this.modalService.closeModal();
  }

  addNewMovieModal(): void {
    this.currentModalAction = TypeActionModal.Create;
    this.item = null; // Reseteamos el item para un nuevo libro
    this.modalService.openModal();
  }

  onOpenModal(event: { action: TypeActionModal; item: any }): void {
    this.currentModalAction = event.action;
    this.item = event.item;
    this.modalService.openModal();
  }

  onCloseModal(): void {
    this.modalService.closeModal();
  }

  sendFormMovie(event: { itemId: number; newMovieData: MovieModel }): void {
    if (event.itemId) {
      this.moviesFacade.editMovie(event.itemId, event.newMovieData);
    } else {
      this.moviesFacade
        .addMovie(event.newMovieData)
        .pipe(
          takeUntilDestroyed(this.destroyRef),
          tap(() => {
            this.onCloseModal();
          })
        )
        .subscribe();
    }
    this.onCloseModal();
  }

  private updateMovieState(movies: MovieModel[] | null): void {
    if (movies === null) {
      return;
    }
    // this.movies = movies.sort((a, b) =>
    //   a.title.toLowerCase().localeCompare(b.title.toLowerCase())
    // );
    this.movies = movies;
    this.filteredMovies = [...this.movies];
    this.number = this.movies.length;
    this.dataLoaded = true;
  }
}
