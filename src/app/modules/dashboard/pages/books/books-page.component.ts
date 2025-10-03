import { CommonModule } from '@angular/common';
import {
  Component,
  DestroyRef,
  ElementRef,
  OnInit,
  Signal,
  ViewChild,
  WritableSignal,
  computed,
  inject,
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
import { IconActionComponent } from 'src/app/shared/components/buttons/icon-action/icon-action.component';
import { InputSearchComponent } from 'src/app/shared/components/inputs/input-search/input-search.component';
import { SpinnerLoadingComponent } from 'src/app/shared/components/spinner-loading/spinner-loading.component';
import { GeneralService } from 'src/app/shared/services/generalService.service';
import { PdfPrintService } from 'src/app/shared/services/PdfPrintService.service';

import { StickyZoneComponent } from '../../components/sticky-zone/sticky-zone.component';
import { ColumnMenuComponent } from '../../components/table/column-menu.component';

// Shell de modal (wrapper)
import { ModalShellComponent } from 'src/app/shared/components/modal/modal-shell.component';
import { ModalService } from 'src/app/shared/components/modal/services/modal.service';

// Store de visibilidad de columnas con signals
import { ColumnVisibilityStore } from '../../components/table/column-visibility.store';

@Component({
  selector: 'app-books-page',
  standalone: true,
  imports: [
    // UI
    DashboardHeaderComponent,
    SpinnerLoadingComponent,
    StickyZoneComponent,
    TableComponent,
    FiltersComponent,
    ButtonIconComponent,
    IconActionComponent,
    InputSearchComponent,
    ColumnMenuComponent,
    ModalShellComponent, // 👈 usamos shell
    // Angular
    CommonModule,
    ReactiveFormsModule,
    MatMenuModule,
    MatCheckboxModule,
  ],
  templateUrl: './books-page.component.html',
})
export class BooksPageComponent implements OnInit {
  // Servicios
  private readonly destroyRef = inject(DestroyRef);
  private readonly modalService = inject(ModalService);
  private readonly booksService = inject(BooksService);
  private readonly generalService = inject(GeneralService);
  private readonly pdfPrintService = inject(PdfPrintService);
  private readonly colStore = inject(ColumnVisibilityStore);

  // Facade (pública para async pipes)
  readonly booksFacade = inject(BooksFacade);

  // Definición de columnas
  headerListBooks: ColumnModel[] = [
    { title: 'Portada', key: 'img', sortable: false },
    { title: 'Título', key: 'title', sortable: true },
    {
      title: 'Autor/a',
      key: 'author',
      sortable: true,
      showIndicatorOnEmpty: true,
      width: ColumnWidth.XL,
    },
    {
      title: 'Descripción',
      key: 'description',
      sortable: true,
      innerHTML: true,
    },
    {
      title: 'Género',
      key: 'gender',
      sortable: true,
      backColor: true,
      width: ColumnWidth.SM,
    },
    { title: 'Año compra', key: 'year', sortable: true, width: ColumnWidth.XS },
  ];

  // Datos
  books: BookModel[] = [];
  filteredBooks: BookModel[] = [];
  number = 0;

  // Filtros
  filters: Filter[] = [];
  selectedFilter = '';

  // Modal
  isModalVisible = false;
  item: BookModel | null = null;
  currentModalAction: TypeActionModal = TypeActionModal.Create;
  typeModal: TypeList = TypeList.Books;
  typeSection: TypeList = TypeList.Books;

  // Form
  searchForm!: FormGroup;

  // Signals (visibilidad de columnas)
  columnVisSig!: WritableSignal<Record<string, boolean>>;
  displayedColumnsSig!: Signal<string[]>;

  // Refs
  @ViewChild(InputSearchComponent)
  private inputSearchComponent!: InputSearchComponent;

  @ViewChild('printArea', { static: false })
  printArea!: ElementRef<HTMLElement>;

  // ──────────────────────────────────────────────────────────────────────────────
  // Lifecycle
  // ──────────────────────────────────────────────────────────────────────────────
  ngOnInit(): void {
    // Visibilidad de columnas (persistente por tabla)
    this.columnVisSig = this.colStore.init(
      'books-table', // clave única para esta tabla
      this.headerListBooks,
      ['year'] // columnas ocultas por defecto
    );

    this.displayedColumnsSig = computed(() =>
      this.colStore.displayedColumns(this.headerListBooks, this.columnVisSig())
    );

    // Filtros
    this.filters = [
      { code: 'NOVEDADES', name: 'Novedades' },
      { code: '', name: 'Todos' },
      ...genderFilterBooks,
    ];

    // Modal visibilidad
    this.modalService.modalVisibility$
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        tap((isVisible) => (this.isModalVisible = isVisible))
      )
      .subscribe();

    // Carga inicial
    this.filterSelected('');

    // Estado desde la facade
    this.booksFacade.filteredBooks$
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        tap((books) => this.updateBookState(books))
      )
      .subscribe();
  }

  // ──────────────────────────────────────────────────────────────────────────────
  // Filtros / búsqueda
  // ──────────────────────────────────────────────────────────────────────────────
  filterSelected(filter: string): void {
    this.selectedFilter = filter;

    this.generalService.clearSearchInput(this.inputSearchComponent);

    if (!filter) {
      this.booksFacade.loadAllBooks();
    } else {
      this.booksFacade.loadBooksByFilter(filter);
    }
  }

  applyFilterWord(keyword: string): void {
    this.booksFacade.applyFilterWord(keyword);
  }

  // ──────────────────────────────────────────────────────────────────────────────
  // Modal
  // ──────────────────────────────────────────────────────────────────────────────
  addNewBookModal(): void {
    this.openModal(TypeList.Books, TypeActionModal.Create, null);
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

    // Importante: sólo limpiar en CREATE para no abrir vacío al ver/editar
    if (typeModal === TypeList.Books && action === TypeActionModal.Create) {
      this.booksFacade.clearSelectedBook();
    }

    this.modalService.openModal();
  }

  onCloseModal(): void {
    this.modalService.closeModal();
    this.item = null; // limpiar referencia para no arrastrar estado
  }

  // ──────────────────────────────────────────────────────────────────────────────
  // CRUD
  // ──────────────────────────────────────────────────────────────────────────────
  onDelete({ type, id }: { type: TypeList; id: number }) {
    const actions: Partial<Record<TypeList, (id: number) => void>> = {
      [TypeList.Books]: (x) => this.booksFacade.deleteBook(x),
    };
    actions[type]?.(id);
  }

  sendFormBook(event: { itemId: number; formData: FormData }): void {
    const save$ = event.itemId
      ? this.booksFacade.editBook(event.formData)
      : this.booksFacade.addBook(event.formData);

    save$
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        tap(() => this.onCloseModal())
      )
      .subscribe();
  }

  // ──────────────────────────────────────────────────────────────────────────────
  // Tabla helpers
  // ──────────────────────────────────────────────────────────────────────────────
  private updateBookState(books: BookModel[] | null): void {
    if (!books) return;

    this.books = this.booksService.sortBooksById(books);
    this.filteredBooks = [...this.books];
    this.number = this.booksService.countBooks(books);
  }

  getVisibleColumns(): ColumnModel[] {
    return this.colStore.visibleColumnModels(
      this.headerListBooks,
      this.columnVisSig()
    );
  }

  toggleColumn(key: string): void {
    this.colStore.toggle('books-table', this.columnVisSig, key);
  }

  // ──────────────────────────────────────────────────────────────────────────────
  // Impresión
  // ──────────────────────────────────────────────────────────────────────────────
  async printTableAsPdf(): Promise<void> {
    if (!this.printArea) return;

    await this.pdfPrintService.printElementAsPdf(this.printArea, {
      filename: 'libros.pdf',
      preset: 'compact',
      orientation: 'portrait',
      format: 'a4',
      margins: [5, 5, 5, 5],
    });
  }
}
