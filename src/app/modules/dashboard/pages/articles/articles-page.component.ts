import { CommonModule } from '@angular/common';
import { Component, DestroyRef, inject, OnInit } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormGroup, ReactiveFormsModule } from '@angular/forms';
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
import { AddButtonComponent } from 'src/app/shared/components/buttons/button-add/button-add.component';
import { InputSearchComponent } from 'src/app/shared/components/inputs/input-search/input-search.component';
import { ModalComponent } from 'src/app/shared/components/modal/modal.component';
import { ModalService } from 'src/app/shared/components/modal/services/modal.service';
import { SpinnerLoadingComponent } from 'src/app/shared/components/spinner-loading/spinner-loading.component';

@Component({
  selector: 'app-articles-page',
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
  ],
  templateUrl: './articles-page.component.html',
  styleUrl: './articles-page.component.css',
})
export class ArticlesPageComponent implements OnInit {
  private readonly destroyRef = inject(DestroyRef);
  private readonly modalService = inject(ModalService);
  private readonly articlesFacade = inject(ArticlesFacade);
  private readonly articlesService = inject(ArticlesService);

  articles: ArticleModel[] = [];
  filteredArticles: ArticleModel[] = [];

  isLoading = true;
  isModalVisible = false;
  number = 0;

  item: ArticleModel | null = null;
  currentModalAction: TypeActionModal = TypeActionModal.Create;
  searchForm!: FormGroup;
  typeList = TypeList.Articles;

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
    this.openModal(TypeActionModal.Create, null);
  }

  onOpenModal(event: { action: TypeActionModal; item?: ArticleModel }): void {
    this.openModal(event.action, event.item ?? null);
  }

  openModal(action: TypeActionModal, article: ArticleModel | null): void {
    this.currentModalAction = action;
    this.item = article;
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
}
