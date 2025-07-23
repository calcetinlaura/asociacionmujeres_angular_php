import { Component, Input } from '@angular/core';
import { BookModel } from 'src/app/core/interfaces/book.interface';
import { TypeList } from 'src/app/core/models/general.model';
import { TextBackgroundComponent } from 'src/app/shared/components/text/text-background/text-background.component';
import { TextEditorComponent } from 'src/app/shared/components/text/text-editor/text-editor.component';
import { TextSubTitleComponent } from 'src/app/shared/components/text/text-subTitle/text-subtitle.component';
import { TextTitleComponent } from 'src/app/shared/components/text/text-title/text-title.component';

@Component({
  selector: 'app-modal-show-book',
  imports: [
    TextBackgroundComponent,
    TextTitleComponent,
    TextSubTitleComponent,
    TextEditorComponent,
  ],
  templateUrl: './modal-show-book.component.html',
})
export class ModalShowBookComponent {
  @Input() item!: BookModel;
  typeModal: TypeList = TypeList.Books;
}
