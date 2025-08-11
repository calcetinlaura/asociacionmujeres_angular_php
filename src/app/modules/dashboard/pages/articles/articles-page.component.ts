import { CommonModule } from '@angular/common';
import { Component, DestroyRef, inject, OnInit } from '@angular/core';
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
  selector: 'app-articles-page',
  imports: [
    DashboardHeaderComponent,
    ModalComponent,
    ButtonIconComponent,
    ReactiveFormsModule,
    InputSearchComponent,
    SpinnerLoadingComponent,
    TableComponent,
    IconActionComponent,
    ButtonComponent,
    MatMenuModule,
    MatCheckboxModule,
    CommonModule,
    StickyZoneComponent,
  ],
  templateUrl: './articles-page.component.html',
  styleUrl: './articles-page.component.css',
})
export class ArticlesPageComponent implements OnInit {
  private readonly destroyRef = inject(DestroyRef);
  private readonly modalService = inject(ModalService);
  private readonly articlesFacade = inject(ArticlesFacade);
  private readonly articlesService = inject(ArticlesService);
  private readonly pdfPrintService = inject(PdfPrintService);
  private readonly generalService = inject(GeneralService);
  articles: ArticleModel[] = [];
  filteredArticles: ArticleModel[] = [];

  isLoading = true;
  isModalVisible = false;
  number = 0;

  item: ArticleModel | null = null;
  currentModalAction: TypeActionModal = TypeActionModal.Create;
  searchForm!: FormGroup;
  typeSection = TypeList.Articles;
  typeModal = TypeList.Articles;
  columnVisibility: Record<string, boolean> = {};
  displayedColumns: string[] = [];
  headerListArticles: ColumnModel[] = [
    { title: 'Portada', key: 'img', sortable: false, width: ColumnWidth.XS },
    { title: 'Título', key: 'title', sortable: true },
    { title: 'Fecha', key: 'date', sortable: true },
    {
      title: 'Descripción',
      key: 'description',
      sortable: true,
      booleanIndicator: true,
      width: ColumnWidth.SM,
    },
  ];

  ngOnInit(): void {
    // Ocultar 'date_payment' y 'date_accounting' al cargar la página
    this.columnVisibility = this.generalService.setColumnVisibility(
      this.headerListArticles,
      [''] // Coloca las columnas que deseas ocultar aquí
    );

    // Actualiza las columnas visibles según el estado de visibilidad
    this.displayedColumns = this.generalService.updateDisplayedColumns(
      this.headerListArticles,
      this.columnVisibility
    );
    this.modalService.modalVisibility$
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        tap((isVisible) => (this.isModalVisible = isVisible))
      )
      .subscribe();

    this.loadAllArticles();
  }

  loadAllArticles(): void {
    this.articlesFacade.loadAllArticles();
    this.articlesFacade.filteredArticles$
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        tap((articles) => {
          this.updateArticleState(articles);
        })
      )
      .subscribe();
  }

  applyFilterWord(keyword: string): void {
    this.articlesFacade.applyFilterWord(keyword);
  }

  addNewArticleModal(): void {
    this.openModal(this.typeModal, TypeActionModal.Create, null);
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
    this.modalService.openModal();
  }

  onCloseModal(): void {
    this.modalService.closeModal();
  }

  confirmDeleteArticle(article: ArticleModel | null): void {
    if (!article) return;
    this.articlesFacade.deleteArticle(article.id);
    this.onCloseModal();
  }

  sendFormArticle(event: { itemId: number; formData: FormData }): void {
    const save$ = event.itemId
      ? this.articlesFacade.editArticle(event.itemId, event.formData)
      : this.articlesFacade.addArticle(event.formData);

    save$
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        tap(() => this.onCloseModal())
      )
      .subscribe();
  }

  private updateArticleState(articles: ArticleModel[] | null): void {
    if (!articles) return;

    this.articles = this.articlesService.sortArticlesById(articles);
    this.filteredArticles = [...this.articles];
    this.number = this.articlesService.countArticles(articles);
    this.isLoading = false;
  }
  printTableAsPdf(): void {
    this.pdfPrintService.printTableAsPdf('table-to-print', 'articulos.pdf');
  }
  getVisibleColumns() {
    return this.headerListArticles.filter(
      (col) => this.columnVisibility[col.key]
    );
  }
  // Método para actualizar las columnas visibles cuando se hace toggle
  toggleColumn(key: string): void {
    // Cambia la visibilidad de la columna en columnVisibility
    this.columnVisibility[key] = !this.columnVisibility[key];
    // Actualiza las columnas visibles en la tabla después de cambiar el estado
    this.displayedColumns = this.generalService.updateDisplayedColumns(
      this.headerListArticles,
      this.columnVisibility
    );
  }
}
