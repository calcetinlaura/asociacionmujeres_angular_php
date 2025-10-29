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

import { ArticlesFacade } from 'src/app/application/articles.facade';
import { ArticleModel } from 'src/app/core/interfaces/article.interface';
import {
  ColumnModel,
  ColumnWidth,
} from 'src/app/core/interfaces/column.interface';
import { TypeActionModal, TypeList } from 'src/app/core/models/general.model';
import { ArticlesService } from 'src/app/core/services/articles.services';
import { PdfPrintService } from 'src/app/core/services/PdfPrintService.service';

import { DashboardHeaderComponent } from 'src/app/shared/components/dashboard-header/dashboard-header.component';
import { ModalShellComponent } from 'src/app/shared/components/modal/modal-shell.component';
import { PageToolbarComponent } from 'src/app/shared/components/page-toolbar/page-toolbar.component';
import { SpinnerLoadingComponent } from 'src/app/shared/components/spinner-loading/spinner-loading.component';
import { StickyZoneComponent } from 'src/app/shared/components/sticky-zone/sticky-zone.component';
import { TableComponent } from 'src/app/shared/components/table/table.component';

import { FiltersFacade } from 'src/app/application/filters.facade';
import { ModalFacade } from 'src/app/application/modal.facade';
import { useColumnVisibility } from 'src/app/shared/hooks/use-column-visibility';
import { useEntityList } from 'src/app/shared/hooks/use-entity-list';

@Component({
  selector: 'app-articles-page',
  standalone: true,
  imports: [
    // UI
    DashboardHeaderComponent,
    SpinnerLoadingComponent,
    StickyZoneComponent,
    TableComponent,
    ModalShellComponent,
    PageToolbarComponent,
    // Angular
    CommonModule,
    MatMenuModule,
    MatCheckboxModule,
  ],
  templateUrl: './articles-page.component.html',
})
export class ArticlesPageComponent implements OnInit {
  // ──────────────────────────────────────────────────────────────────────────────
  // Inyecciones
  // ──────────────────────────────────────────────────────────────────────────────
  private readonly destroyRef = inject(DestroyRef);
  private readonly modalFacade = inject(ModalFacade);
  private readonly articlesService = inject(ArticlesService);
  private readonly pdfPrintService = inject(PdfPrintService);
  readonly articlesFacade = inject(ArticlesFacade);
  readonly filtersFacade = inject(FiltersFacade);

  // ──────────────────────────────────────────────────────────────────────────────
  // Cabecera de tabla
  // ──────────────────────────────────────────────────────────────────────────────
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
    {
      title: 'Resumen',
      key: 'summary',
      sortable: true,
      booleanIndicator: true,
      width: ColumnWidth.XS,
    },
  ];

  // ──────────────────────────────────────────────────────────────────────────────
  // Hooks reutilizables
  // ──────────────────────────────────────────────────────────────────────────────
  readonly col = useColumnVisibility('articles-table', this.headerListArticles);

  readonly list = useEntityList<ArticleModel>({
    filtered$: this.articlesFacade.filteredArticles$.pipe(map((v) => v ?? [])),
    sort: (arr) => this.articlesService.sortArticlesById(arr),
    count: (arr) => this.articlesService.countArticles(arr),
  });

  readonly TypeList = TypeList;
  readonly hasRowsSig = computed(() => this.list.countSig() > 0);

  // ──────────────────────────────────────────────────────────────────────────────
  // Modal (ModalFacade)
  // ──────────────────────────────────────────────────────────────────────────────
  readonly modalVisibleSig = this.modalFacade.isVisibleSig;
  readonly currentModalTypeSig = this.modalFacade.typeSig;
  readonly currentModalActionSig = this.modalFacade.actionSig;
  readonly currentItemSig = this.modalFacade.itemSig;

  // Ref impresión
  @ViewChild('printArea', { static: false })
  printArea!: ElementRef<HTMLElement>;

  // ──────────────────────────────────────────────────────────────────────────────
  // Lifecycle
  // ──────────────────────────────────────────────────────────────────────────────
  ngOnInit(): void {
    this.articlesFacade.loadAllArticles();
  }

  // ──────────────────────────────────────────────────────────────────────────────
  // Búsqueda
  // ──────────────────────────────────────────────────────────────────────────────
  applyFilterWord(keyword: string): void {
    this.filtersFacade.setSearch(keyword);
    this.articlesFacade.applyFilterWord(keyword);
  }

  // ──────────────────────────────────────────────────────────────────────────────
  // Modal + CRUD
  // ──────────────────────────────────────────────────────────────────────────────
  addNewArticleModal(): void {
    this.articlesFacade.clearSelectedArticle();
    this.modalFacade.open(TypeList.Articles, TypeActionModal.Create, null);
  }

  onOpenModal(event: {
    typeModal: TypeList;
    action: TypeActionModal;
    item?: ArticleModel;
  }): void {
    const { typeModal, action, item } = event;
    if (
      typeModal === TypeList.Articles &&
      action !== TypeActionModal.Create &&
      item?.id
    ) {
      this.articlesService
        .getArticleById(item.id)
        .pipe(takeUntilDestroyed(this.destroyRef))
        .subscribe({
          next: (fresh) =>
            this.modalFacade.open(typeModal, action, fresh ?? item ?? null),
          error: () => this.modalFacade.open(typeModal, action, item ?? null),
        });
      return;
    }

    this.modalFacade.open(typeModal, action, item ?? null);
  }

  onCloseModal(): void {
    this.modalFacade.close();
  }

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
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(() => this.modalFacade.close());
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
