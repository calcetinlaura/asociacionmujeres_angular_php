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

import { ArticlesFacade } from 'src/app/application/articles.facade';
import { ArticleModel } from 'src/app/core/interfaces/article.interface';
import {
  ColumnModel,
  ColumnWidth,
} from 'src/app/core/interfaces/column.interface';
import { TypeActionModal, TypeList } from 'src/app/core/models/general.model';
import { ArticlesService } from 'src/app/core/services/articles.services';

import { DashboardHeaderComponent } from 'src/app/modules/dashboard/components/dashboard-header/dashboard-header.component';
import { TableComponent } from 'src/app/modules/dashboard/components/table/table.component';
import { ButtonIconComponent } from 'src/app/shared/components/buttons/button-icon/button-icon.component';
import { IconActionComponent } from 'src/app/shared/components/buttons/icon-action/icon-action.component';
import { InputSearchComponent } from 'src/app/shared/components/inputs/input-search/input-search.component';
import { SpinnerLoadingComponent } from 'src/app/shared/components/spinner-loading/spinner-loading.component';
import { PdfPrintService } from 'src/app/shared/services/PdfPrintService.service';

import { StickyZoneComponent } from '../../components/sticky-zone/sticky-zone.component';
import { ColumnMenuComponent } from '../../components/table/column-menu.component';
import { ColumnVisibilityStore } from '../../components/table/column-visibility.store';

// 👇 Shell de modales unificado
import { ModalShellComponent } from 'src/app/shared/components/modal/modal-shell.component';
import { ModalService } from 'src/app/shared/components/modal/services/modal.service';

@Component({
  selector: 'app-articles-page',
  standalone: true,
  imports: [
    // UI
    DashboardHeaderComponent,
    SpinnerLoadingComponent,
    StickyZoneComponent,
    TableComponent,
    ButtonIconComponent,
    IconActionComponent,
    InputSearchComponent,
    ColumnMenuComponent,
    ModalShellComponent,
    // Angular
    CommonModule,
    ReactiveFormsModule,
    MatMenuModule,
    MatCheckboxModule,
  ],
  templateUrl: './articles-page.component.html',
})
export class ArticlesPageComponent implements OnInit {
  // Servicios
  private readonly destroyRef = inject(DestroyRef);
  private readonly modalService = inject(ModalService);
  private readonly articlesService = inject(ArticlesService);
  private readonly pdfPrintService = inject(PdfPrintService);
  private readonly colStore = inject(ColumnVisibilityStore);

  // Facade (pública para template con async pipe si la usas)
  readonly articlesFacade = inject(ArticlesFacade);

  // Cabecera de tabla
  headerListArticles: ColumnModel[] = [
    { title: 'Portada', key: 'img', sortable: false, width: ColumnWidth.XS },
    { title: 'Título', key: 'title', sortable: true },
    { title: 'Fecha', key: 'date', sortable: true },
    {
      title: 'Descripción',
      key: 'description',
      sortable: true,
      innerHTML: true,
      showIndicatorOnEmpty: true,
      width: ColumnWidth.LG,
    },
  ];

  // ✅ Signals de visibilidad de columnas
  columnVisSig!: WritableSignal<Record<string, boolean>>;
  displayedColumnsSig!: Signal<string[]>;

  // Datos
  articles: ArticleModel[] = [];
  filteredArticles: ArticleModel[] = [];
  number = 0;

  // Modal
  isModalVisible = false;
  item: ArticleModel | null = null;
  currentModalAction: TypeActionModal = TypeActionModal.Create;
  typeModal: TypeList = TypeList.Articles;
  typeSection: TypeList = TypeList.Articles;

  // Form
  searchForm!: FormGroup;

  // Refs
  @ViewChild('printArea', { static: false })
  printArea!: ElementRef<HTMLElement>;

  // ──────────────────────────────────────────────────────────────────────────────
  // Lifecycle
  // ──────────────────────────────────────────────────────────────────────────────
  ngOnInit(): void {
    // Columnas visibles (persistentes por clave)
    this.columnVisSig = this.colStore.init(
      'articles-table',
      this.headerListArticles,
      [] // ocultas por defecto
    );
    this.displayedColumnsSig = computed(() =>
      this.colStore.displayedColumns(
        this.headerListArticles,
        this.columnVisSig()
      )
    );

    // Visibilidad modal
    this.modalService.modalVisibility$
      .pipe(takeUntilDestroyed(this.destroyRef))
      .pipe(tap((v) => (this.isModalVisible = v)))
      .subscribe();

    // Carga inicial
    this.loadAllArticles();
  }

  // ──────────────────────────────────────────────────────────────────────────────
  // Carga / búsqueda
  // ──────────────────────────────────────────────────────────────────────────────
  loadAllArticles(): void {
    this.articlesFacade.loadAllArticles();
    this.articlesFacade.filteredArticles$
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        tap((articles) => this.updateArticleState(articles))
      )
      .subscribe();
  }

  applyFilterWord(keyword: string): void {
    this.articlesFacade.applyFilterWord(keyword);
  }

  // ──────────────────────────────────────────────────────────────────────────────
  // Modal
  // ──────────────────────────────────────────────────────────────────────────────
  addNewArticleModal(): void {
    this.openModal(TypeList.Articles, TypeActionModal.Create, null);
  }

  onOpenModal(event: {
    typeModal: TypeList;
    action: TypeActionModal;
    item?: ArticleModel;
  }): void {
    this.openModal(event.typeModal, event.action, event.item ?? null);
  }

  openModal(
    typeModal: TypeList,
    action: TypeActionModal,
    article: ArticleModel | null
  ): void {
    this.currentModalAction = action;
    this.item = article;
    this.typeModal = typeModal;

    // 🧹 Limpiar seleccionado SOLO en Create
    if (typeModal === TypeList.Articles && action === TypeActionModal.Create) {
      this.articlesFacade.clearSelectedArticle();
    }

    this.modalService.openModal();
  }

  onCloseModal(): void {
    this.modalService.closeModal();
    this.item = null; // evitar arrastrar estado
  }

  // ──────────────────────────────────────────────────────────────────────────────
  // CRUD
  // ──────────────────────────────────────────────────────────────────────────────
  onDelete({ type, id }: { type: TypeList; id: number }) {
    const actions: Partial<Record<TypeList, (id: number) => void>> = {
      [TypeList.Articles]: (x) => this.articlesFacade.deleteArticle(x),
    };
    actions[type]?.(id);
  }

  sendFormArticle(event: { itemId: number; formData: FormData }): void {
    const save$ = event.itemId
      ? this.articlesFacade.editArticle(event.formData)
      : this.articlesFacade.addArticle(event.formData);

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
  private updateArticleState(articles: ArticleModel[] | null): void {
    if (!articles) return;

    this.articles = this.articlesService.sortArticlesById(articles);
    this.filteredArticles = [...this.articles];
    this.number = this.articlesService.countArticles(articles);
  }

  getVisibleColumns(): ColumnModel[] {
    return this.colStore.visibleColumnModels(
      this.headerListArticles,
      this.columnVisSig()
    );
  }

  toggleColumn(key: string): void {
    this.colStore.toggle('articles-table', this.columnVisSig, key);
  }

  // ──────────────────────────────────────────────────────────────────────────────
  // Impresión
  // ──────────────────────────────────────────────────────────────────────────────
  async printTableAsPdf(): Promise<void> {
    if (!this.printArea) return;

    await this.pdfPrintService.printElementAsPdf(this.printArea, {
      filename: 'articulos.pdf',
      preset: 'compact',
      orientation: 'portrait',
      format: 'a4',
      margins: [5, 5, 5, 5],
    });
  }
}
