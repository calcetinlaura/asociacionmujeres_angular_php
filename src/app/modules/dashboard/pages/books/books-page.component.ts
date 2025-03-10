import {
  Component,
  DestroyRef,
  ElementRef,
  HostListener,
  inject,
  OnInit,
  ViewChild,
} from '@angular/core';
import { DashboardHeaderComponent } from '../../components/dashboard-header/dashboard-header.component';
import { TypeActionModal, TypeList } from 'src/app/core/models/general.model';
import { ColumnModel } from 'src/app/core/interfaces/column.interface';
import { TableComponent } from '../../components/table/table.component';
import { ModalComponent } from 'src/app/shared/components/modal/modal.component';
import { CommonModule } from '@angular/common';
import { BooksFacade } from 'src/app/application';
import { FormControl, FormGroup, ReactiveFormsModule } from '@angular/forms';
import { ModalService } from 'src/app/shared/components/modal/services/modal.service';
import { tap } from 'rxjs';
import { AddButtonComponent } from 'src/app/shared/components/buttons/button-add/button-add.component';
import { InputSearchComponent } from 'src/app/shared/components/inputs/input-search/input-search.component';
import { BookModel } from 'src/app/core/interfaces/book.interface';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { SpinnerLoadingComponent } from '../../../landing/components/spinner-loading/spinner-loading.component';

@Component({
  selector: 'app-books-page',
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
  templateUrl: './books-page.component.html',
  styleUrl: './books-page.component.css',
})
export class BooksPageComponent implements OnInit {
  private booksFacade = inject(BooksFacade);
  private modalService = inject(ModalService);
  private destroyRef = inject(DestroyRef);

  typeList = TypeList.Books;
  books: BookModel[] = [];
  filteredBooks: BookModel[] = [];
  searchForm!: FormGroup;
  dataLoaded: boolean = false;
  number: number = 0;
  headerListBooks: ColumnModel[] = [];
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

    if (scrollPosition > 50) {
      this.isStickyToolbar = true;
    } else {
      this.isStickyToolbar = false;
    }
  }

  ngOnInit(): void {
    this.loadAllBooks();

    this.modalService.modalVisibility$
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        tap((isVisible) => {
          this.isModalVisible = isVisible;
        })
      )
      .subscribe();

    this.headerListBooks = [
      { title: 'Portada', key: 'img' },
      { title: 'Título', key: 'title' },
      { title: 'Autor/a', key: 'author' },
      { title: 'Descripción', key: 'description' },
      { title: 'Género', key: 'gender' },
      { title: 'Año compra', key: 'year' },
    ];
  }

  loadAllBooks(): void {
    this.booksFacade.loadAllBooks();
    this.booksFacade.books$
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        tap((books) => {
          this.updateBookState(books);
        })
      )
      .subscribe();
  }

  applyFilter(keyword: string): void {
    this.booksFacade.applyFilter(keyword);
    this.booksFacade.filteredBooks$
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        tap((books) => {
          this.updateBookState(books);
        })
      )
      .subscribe();
  }

  confirmDeleteBook(item: any): void {
    this.booksFacade.deleteBook(item.id);
    this.onCloseModal();
  }

  addNewBookModal(): void {
    this.currentModalAction = TypeActionModal.Create;
    this.item = null;
    this.modalService.openModal();
  }

  onOpenModal(event: { action: TypeActionModal; item?: any }): void {
    this.currentModalAction = event.action;
    this.item = event.item;
    this.modalService.openModal();
  }

  onCloseModal(): void {
    this.modalService.closeModal();
  }

  sendFormBook(event: { itemId: number; newBookData: FormData }): void {
    if (event.itemId) {
      this.booksFacade
        .editBook(event.itemId, event.newBookData)
        .pipe(
          takeUntilDestroyed(this.destroyRef),
          tap(() => {
            this.onCloseModal();
          })
        )
        .subscribe();
    } else {
      this.booksFacade
        .addBook(event.newBookData)
        .pipe(
          takeUntilDestroyed(this.destroyRef),
          tap(() => {
            this.onCloseModal();
          })
        )
        .subscribe();
    }
  }

  private updateBookState(books: BookModel[] | null): void {
    if (books === null) {
      return;
    }
    this.books = books.sort((a, b) => b.id - a.id);
    this.filteredBooks = [...this.books];
    this.number = this.books.length;
    this.dataLoaded = true;
  }
}
