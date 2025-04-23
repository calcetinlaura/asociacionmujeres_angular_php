import { CommonModule } from '@angular/common';
import {
  Component,
  DestroyRef,
  inject,
  OnInit,
  ViewChild,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormGroup, ReactiveFormsModule } from '@angular/forms';
import { tap } from 'rxjs';
import { BooksFacade } from 'src/app/application/books.facade';
import {
  BookModel,
  genderFilterBooks,
} from 'src/app/core/interfaces/book.interface';
import { ColumnModel } from 'src/app/core/interfaces/column.interface';
import {
  Filter,
  TypeActionModal,
  TypeList,
} from 'src/app/core/models/general.model';
import { BooksService } from 'src/app/core/services/books.services';
import { DashboardHeaderComponent } from 'src/app/modules/dashboard/components/dashboard-header/dashboard-header.component';
import { TableComponent } from 'src/app/modules/dashboard/components/table/table.component';
import { FiltersComponent } from 'src/app/modules/landing/components/filters/filters.component';
import { AddButtonComponent } from 'src/app/shared/components/buttons/button-add/button-add.component';
import { InputSearchComponent } from 'src/app/shared/components/inputs/input-search/input-search.component';
import { ModalComponent } from 'src/app/shared/components/modal/modal.component';
import { ModalService } from 'src/app/shared/components/modal/services/modal.service';
import { SpinnerLoadingComponent } from 'src/app/shared/components/spinner-loading/spinner-loading.component';
import { GeneralService } from 'src/app/shared/services/generalService.service';

@Component({
  selector: 'app-books-page',
  standalone: true,
  imports: [
    CommonModule,
    DashboardHeaderComponent,
    ModalComponent,
    AddButtonComponent,
    ReactiveFormsModule,
    InputSearchComponent,
    SpinnerLoadingComponent,
    TableComponent,
    FiltersComponent,
  ],
  templateUrl: './books-page.component.html',
  styleUrl: './books-page.component.css',
})
export class BooksPageComponent implements OnInit {
  private readonly destroyRef = inject(DestroyRef);
  private readonly modalService = inject(ModalService);
  private readonly booksFacade = inject(BooksFacade);
  private readonly booksService = inject(BooksService);
  private readonly generalService = inject(GeneralService);

  headerListBooks: ColumnModel[] = [
    { title: 'Portada', key: 'img', sortable: false },
    { title: 'Título', key: 'title', sortable: true },
    {
      title: 'Autor/a',
      key: 'author',
      sortable: true,
      showIndicatorOnEmpty: true,
    },
    {
      title: 'Descripción',
      key: 'description',
      sortable: true,
      booleanIndicator: true,
      minWidth: true,
    },
    { title: 'Género', key: 'gender', sortable: true, minWidth: true },
    { title: 'Año compra', key: 'year', sortable: true, minWidth: true },
  ];
  books: BookModel[] = [];
  filteredBooks: BookModel[] = [];
  filters: Filter[] = [];
  selectedFilter = 'TODOS';

  isLoading = true;
  isModalVisible = false;
  number = 0;

  item: BookModel | null = null;
  currentModalAction: TypeActionModal = TypeActionModal.Create;
  searchForm!: FormGroup;
  typeList = TypeList.Books;

  @ViewChild(InputSearchComponent)
  private inputSearchComponent!: InputSearchComponent;

  ngOnInit(): void {
    this.filters = [
      { code: 'NOVEDADES', name: 'Novedades' },
      { code: 'TODOS', name: 'Todos' },
      ...genderFilterBooks,
    ];

    this.modalService.modalVisibility$
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        tap((isVisible) => (this.isModalVisible = isVisible))
      )
      .subscribe();

    this.filterSelected('NOVEDADES');

    this.booksFacade.filteredBooks$
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        tap((books) => this.updateBookState(books))
      )
      .subscribe();
  }

  filterSelected(filter: string): void {
    this.selectedFilter = filter;
    this.generalService.clearSearchInput(this.inputSearchComponent);
    this.booksFacade.setCurrentFilter(filter);
  }

  applyFilterWord(keyword: string): void {
    this.booksFacade.applyFilterWord(keyword);
  }

  addNewBookModal(): void {
    this.openModal(TypeActionModal.Create, null);
  }

  onOpenModal(event: { action: TypeActionModal; item?: BookModel }): void {
    this.openModal(event.action, event.item ?? null);
  }

  openModal(action: TypeActionModal, book: BookModel | null): void {
    this.currentModalAction = action;
    this.item = book;
    this.modalService.openModal();
  }

  onCloseModal(): void {
    this.modalService.closeModal();
  }

  confirmDeleteBook(book: BookModel | null): void {
    if (!book) return;
    this.booksFacade.deleteBook(book.id);
    this.onCloseModal();
  }

  sendFormBook(event: { itemId: number; formData: FormData }): void {
    const save$ = event.itemId
      ? this.booksFacade.editBook(event.itemId, event.formData)
      : this.booksFacade.addBook(event.formData);

    save$
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        tap(() => this.onCloseModal())
      )
      .subscribe();
  }

  private updateBookState(books: BookModel[] | null): void {
    if (!books) return;

    this.books = this.booksService.sortBooksById(books);
    this.filteredBooks = [...this.books];
    this.number = this.booksService.countBooks(books);
    this.isLoading = false;
  }
}
