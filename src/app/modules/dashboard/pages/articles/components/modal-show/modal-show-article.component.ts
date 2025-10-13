import { Component, Input } from '@angular/core';
import { ArticleModel } from 'src/app/core/interfaces/article.interface';
import { TypeList } from 'src/app/core/models/general.model';
import { SocialMediaShareComponent } from 'src/app/shared/components/social-media/social-media-share.component';
import { TextEditorComponent } from 'src/app/shared/components/text/text-editor/text-editor.component';
import { TextSubTitleComponent } from 'src/app/shared/components/text/text-subTitle/text-subtitle.component';
import { TextTitleComponent } from 'src/app/shared/components/text/text-title/text-title.component';
import { buildShareUrl } from 'src/app/shared/utils/share-url.util';
import { environments } from 'src/environments/environments';

@Component({
  selector: 'app-modal-show-article',
  imports: [
    TextTitleComponent,
    TextSubTitleComponent,
    TextEditorComponent,
    SocialMediaShareComponent,
  ],
  templateUrl: './modal-show-article.component.html',
})
export class ModalShowArticleComponent {
  @Input() item!: ArticleModel;
  @Input() isDashboard = false;
  typeModal: TypeList = TypeList.Articles;

  get shareTitle(): string {
    const base = this.item?.title ?? 'Artículo';
    return base;
  }

  get shareUrl(): string {
    return this.item?.id
      ? buildShareUrl({
          base: environments.publicBaseUrl,
          path: `/articles/${this.item.id}`,
        })
      : '';
  }
}
