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
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatMenuModule } from '@angular/material/menu';
import { map } from 'rxjs';

import { BooksFacade } from 'src/app/application/books.facade';
import { FiltersFacade } from 'src/app/application/filters.facade'; // ← NUEVO
import { ModalFacade } from 'src/app/application/modal.facade';

import { BookModel } from 'src/app/core/interfaces/book.interface';
import {
  ColumnModel,
  ColumnWidth,
} from 'src/app/core/interfaces/column.interface';
import { TypeActionModal, TypeList } from 'src/app/core/models/general.model';

import { BooksService } from 'src/app/core/services/books.services';
import { PdfPrintService } from 'src/app/core/services/PdfPrintService.service';

import { DashboardHeaderComponent } from 'src/app/shared/components/dashboard-header/dashboard-header.component';
import { FiltersComponent } from 'src/app/shared/components/filters/filters.component';
import { ModalShellComponent } from 'src/app/shared/components/modal/modal-shell.component';
import { PageToolbarComponent } from 'src/app/shared/components/page-toolbar/page-toolbar.component';
import { SpinnerLoadingComponent } from 'src/app/shared/components/spinner-loading/spinner-loading.component';
import { StickyZoneComponent } from 'src/app/shared/components/sticky-zone/sticky-zone.component';
import { TableComponent } from 'src/app/shared/components/table/table.component';

import { useColumnVisibility } from 'src/app/shared/hooks/use-column-visibility';
import { useEntityList } from 'src/app/shared/hooks/use-entity-list';

@Component({
  selector: 'app-books-page',
  standalone: true,
  imports: [
    DashboardHeaderComponent,
    SpinnerLoadingComponent,
    StickyZoneComponent,
    TableComponent,
    FiltersComponent,
    ModalShellComponent,
    PageToolbarComponent,
    CommonModule,
    MatMenuModule,
    MatCheckboxModule,
  ],
  templateUrl: './books-page.component.html',
})
export class BooksPageComponent implements OnInit {
  private readonly destroyRef = inject(DestroyRef);
  private readonly modalFacade = inject(ModalFacade);
  private readonly booksService = inject(BooksService);
  private readonly pdfPrintService = inject(PdfPrintService);
  readonly booksFacade = inject(BooksFacade);
  readonly filtersFacade = inject(FiltersFacade);

  @ViewChild(PageToolbarComponent)
  private toolbarComponent!: PageToolbarComponent;

  headerListBooks: ColumnModel[] = [
    { title: 'Portada', key: 'img', sortable: false },
    { title: 'Título', key: 'title', sortable: true, width: ColumnWidth.XL },
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
      showIndicatorOnEmpty: true,
    },
    {
      title: 'Resumen',
      key: 'summary',
      sortable: true,
      booleanIndicator: true,
      width: ColumnWidth.XS,
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

  readonly col = useColumnVisibility('books-table', this.headerListBooks, [
    'year',
    'gender',
  ]);

  // ─────────────── Lista derivada ───────────────
  readonly list = useEntityList<BookModel>({
    filtered$: this.booksFacade.filteredBooks$.pipe(map((v) => v ?? [])),
    map: (arr) =>
      arr.map((b) => ({ ...b, description: (b.description ?? '').toString() })),
    sort: (arr) => this.booksService.sortBooksById(arr),
    count: (arr) => this.booksService.countBooks(arr),
  });

  readonly TypeList = TypeList;
  readonly hasRowsSig = computed(() => this.list.countSig() > 0);

  // ─────────────── Modal (signals) ───────────────
  readonly modalVisibleSig = this.modalFacade.isVisibleSig;
  readonly currentModalTypeSig = this.modalFacade.typeSig;
  readonly currentModalActionSig = this.modalFacade.actionSig;
  readonly currentItemSig = this.modalFacade.itemSig;

  // ─────────────── Impresión ───────────────
  @ViewChild('printArea', { static: false })
  printArea!: ElementRef<HTMLElement>;

  // ─────────────── Lifecycle ───────────────
  ngOnInit(): void {
    // Cargamos los filtros comunes desde la Facade central
    this.filtersFacade.loadFiltersFor(TypeList.Books);
  }
  ngAfterViewInit(): void {
    setTimeout(() => this.filterSelected('NOVEDADES'));
  }
  // ─────────────── Filtros / búsqueda ───────────────
  filterSelected(filter: string): void {
    this.filtersFacade.selectFilter(filter);

    if (this.toolbarComponent) {
      this.toolbarComponent.clearSearch();
    }

    if (!filter) {
      this.booksFacade.loadAllBooks();
    } else {
      this.booksFacade.loadBooksByFilter(filter);
    }
  }

  applyFilterWord(keyword: string): void {
    this.filtersFacade.setSearch(keyword);
    this.booksFacade.applyFilterWord(keyword);
  }

  // ─────────────── Modal + CRUD ───────────────
  addNewBookModal(): void {
    this.booksFacade.clearSelectedBook();
    this.modalFacade.open(TypeList.Books, TypeActionModal.Create, null);
  }

  onOpenModal(event: {
    typeModal: TypeList;
    action: TypeActionModal;
    item?: BookModel;
  }): void {
    this.modalFacade.open(event.typeModal, event.action, event.item ?? null);
  }

  onCloseModal(): void {
    this.modalFacade.close();
  }

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
      .subscribe(() => this.modalFacade.close());
  }

  // ─────────────── Impresión ───────────────
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
