import { CommonModule } from '@angular/common';
import {
  Component,
  DestroyRef,
  ElementRef,
  OnInit,
  ViewChild,
  computed,
  inject,
} from '@angular/core';
import { takeUntilDestroyed, toSignal } from '@angular/core/rxjs-interop';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatMenuModule } from '@angular/material/menu';

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

import { SpinnerLoadingComponent } from 'src/app/shared/components/spinner-loading/spinner-loading.component';
import { PdfPrintService } from 'src/app/shared/services/PdfPrintService.service';
import { StickyZoneComponent } from '../../components/sticky-zone/sticky-zone.component';

// Reutilizables
import { useColumnVisibility } from 'src/app/shared/hooks/use-column-visibility';
import { useEntityList } from 'src/app/shared/hooks/use-entity-list';
import { PageToolbarComponent } from '../../components/page-toolbar/page-toolbar.component';

// Modal shell + service
import { map } from 'rxjs';
import { ModalShellComponent } from 'src/app/shared/components/modal/modal-shell.component';
import { ModalService } from 'src/app/shared/components/modal/services/modal.service';

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
    ModalShellComponent,
    PageToolbarComponent,
    // Angular
    CommonModule,
    MatMenuModule,
    MatCheckboxModule,
  ],
  templateUrl: './books-page.component.html',
})
export class BooksPageComponent implements OnInit {
  private readonly destroyRef = inject(DestroyRef);
  private readonly modalService = inject(ModalService);
  private readonly booksService = inject(BooksService);
  private readonly pdfPrintService = inject(PdfPrintService);

  // Facade
  readonly booksFacade = inject(BooksFacade);

  // Columnas
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

  // Reutilizables (columnas + lista)
  readonly col = useColumnVisibility('books-table', this.headerListBooks, [
    'year',
  ]);

  // Lista derivada con useEntityList
  readonly list = useEntityList<BookModel>({
    filtered$: this.booksFacade.filteredBooks$.pipe(map((v) => v ?? [])),
    // Normaliza/ajusta datos de salida para la tabla (opcional)
    map: (arr) =>
      arr.map((b) => ({
        ...b,
        // Ejemplo: asegura string en description
        description: (b.description ?? '').toString(),
      })),
    sort: (arr) => this.booksService.sortBooksById(arr),
    count: (arr) => this.booksService.countBooks(arr),
  });

  // Señales derivadas adicionales útiles en plantilla
  readonly hasRowsSig = computed(() => this.list.countSig() > 0);

  // Filtros
  filters: Filter[] = [];
  selectedFilter: string | number = '';

  // Modal
  readonly modalVisibleSig = toSignal(this.modalService.modalVisibility$, {
    initialValue: false,
  });
  item: BookModel | null = null;
  currentModalAction: TypeActionModal = TypeActionModal.Create;
  typeModal: TypeList = TypeList.Books;
  typeSection: TypeList = TypeList.Books;

  // Refs
  @ViewChild('printArea', { static: false })
  printArea!: ElementRef<HTMLElement>;

  // ──────────────────────────────────────────────────────────────────────────────
  // Lifecycle
  // ──────────────────────────────────────────────────────────────────────────────
  ngOnInit(): void {
    this.filters = [
      { code: 'NOVEDADES', name: 'Novedades' },
      { code: '', name: 'Todos' },
      ...genderFilterBooks,
    ];

    // carga inicial
    this.filterSelected('');
  }

  // ──────────────────────────────────────────────────────────────────────────────
  // Filtros / búsqueda
  // ──────────────────────────────────────────────────────────────────────────────
  filterSelected(filter: string): void {
    this.selectedFilter = filter;

    // Reset búsqueda de texto al cambiar filtro
    this.booksFacade.applyFilterWord('');

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
  // Modal + navegación
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

    if (typeModal === TypeList.Books && action === TypeActionModal.Create) {
      this.booksFacade.clearSelectedBook();
    }

    this.modalService.openModal();
  }

  onCloseModal(): void {
    this.modalService.closeModal();
    this.item = null;
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
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(() => this.onCloseModal());
  }

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
