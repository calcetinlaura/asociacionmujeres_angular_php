
import { Component, Input } from '@angular/core';
import { ArticleModel } from 'src/app/core/interfaces/article.interface';
import { TypeList } from 'src/app/core/models/general.model';
import { TextEditorComponent } from 'src/app/shared/components/text/text-editor/text-editor.component';
import { TextSubTitleComponent } from 'src/app/shared/components/text/text-subTitle/text-subtitle.component';
import { TextTitleComponent } from 'src/app/shared/components/text/text-title/text-title.component';

@Component({
    selector: 'app-modal-show-article',
    imports: [
    TextTitleComponent,
    TextSubTitleComponent,
    TextEditorComponent
],
    templateUrl: './modal-show-article.component.html'
})
export class ModalShowArticleComponent {
  @Input() item!: ArticleModel;
  type: TypeList = TypeList.Articles;
}
