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
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatMenuModule } from '@angular/material/menu';
import { tap } from 'rxjs';
import { BooksFacade } from 'src/app/application/books.facade';
import {
  BookModel,
  genderFilterBooks,
} from 'src/app/core/interfaces/book.interface';
import {
  ColumnModel,
  ColumnWidth,
} from 'src/app/core/interfaces/column.interface';
import {
  Filter,
  TypeActionModal,
  TypeList,
} from 'src/app/core/models/general.model';
import { BooksService } from 'src/app/core/services/books.services';
import { DashboardHeaderComponent } from 'src/app/modules/dashboard/components/dashboard-header/dashboard-header.component';
import { TableComponent } from 'src/app/modules/dashboard/components/table/table.component';
import { FiltersComponent } from 'src/app/modules/landing/components/filters/filters.component';
import { ButtonIconComponent } from 'src/app/shared/components/buttons/button-icon/button-icon.component';
import { ButtonComponent } from 'src/app/shared/components/buttons/button/button.component';
import { IconActionComponent } from 'src/app/shared/components/buttons/icon-action/icon-action.component';
import { InputSearchComponent } from 'src/app/shared/components/inputs/input-search/input-search.component';
import { ModalComponent } from 'src/app/shared/components/modal/modal.component';
import { ModalService } from 'src/app/shared/components/modal/services/modal.service';
import { SpinnerLoadingComponent } from 'src/app/shared/components/spinner-loading/spinner-loading.component';
import { GeneralService } from 'src/app/shared/services/generalService.service';
import { PdfPrintService } from 'src/app/shared/services/PdfPrintService.service';
import { StickyZoneComponent } from '../../components/sticky-zone/sticky-zone.component';

@Component({
  selector: 'app-books-page',
  imports: [
    DashboardHeaderComponent,
    ModalComponent,
    ButtonIconComponent,
    ReactiveFormsModule,
    InputSearchComponent,
    SpinnerLoadingComponent,
    TableComponent,
    FiltersComponent,
    IconActionComponent,
    ButtonComponent,
    MatMenuModule,
    MatCheckboxModule,
    CommonModule,
    StickyZoneComponent,
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
  private readonly pdfPrintService = inject(PdfPrintService);
  columnVisibility: Record<string, boolean> = {};
  displayedColumns: string[] = [];
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
      width: ColumnWidth.SM,
    },
    {
      title: 'Género',
      key: 'gender',
      sortable: true,
      backColor: true,
      width: ColumnWidth.XS,
    },
    { title: 'Año compra', key: 'year', sortable: true, width: ColumnWidth.XS },
  ];
  books: BookModel[] = [];
  filteredBooks: BookModel[] = [];
  filters: Filter[] = [];
  selectedFilter = 'ALL';

  isLoading = true;
  isModalVisible = false;
  number = 0;

  item: BookModel | null = null;
  currentModalAction: TypeActionModal = TypeActionModal.Create;
  searchForm!: FormGroup;

  typeModal = TypeList.Books;
  typeSection = TypeList.Books;

  @ViewChild(InputSearchComponent)
  private inputSearchComponent!: InputSearchComponent;

  ngOnInit(): void {
    // Ocultar 'date_payment' y 'date_accounting' al cargar la página
    this.columnVisibility = this.generalService.setColumnVisibility(
      this.headerListBooks,
      ['year'] // Coloca las columnas que deseas ocultar aquí
    );

    // Actualiza las columnas visibles según el estado de visibilidad
    this.displayedColumns = this.generalService.updateDisplayedColumns(
      this.headerListBooks,
      this.columnVisibility
    );
    this.filters = [
      { code: 'NOVEDADES', name: 'Novedades' },
      { code: 'ALL', name: 'Todos' },
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
    this.openModal(this.typeModal, TypeActionModal.Create, null);
  }

  onOpenModal(event: {
    typeModal: TypeList;
    action: TypeActionModal;
    item?: BookModel;
  }): void {
    this.openModal(event.typeModal, event.action, event.item ?? null);
  }

  openModal(
    typeModal: TypeList,
    action: TypeActionModal,
    book: BookModel | null
  ): void {
    this.currentModalAction = action;
    this.item = book;
    this.typeModal = typeModal;
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
  printTableAsPdf(): void {
    this.pdfPrintService.printTableAsPdf('table-to-print', 'libros.pdf');
  }
  getVisibleColumns() {
    return this.headerListBooks.filter((col) => this.columnVisibility[col.key]);
  }
  // Método para actualizar las columnas visibles cuando se hace toggle
  toggleColumn(key: string): void {
    // Cambia la visibilidad de la columna en columnVisibility
    this.columnVisibility[key] = !this.columnVisibility[key];
    // Actualiza las columnas visibles en la tabla después de cambiar el estado
    this.displayedColumns = this.generalService.updateDisplayedColumns(
      this.headerListBooks,
      this.columnVisibility
    );
  }
}
