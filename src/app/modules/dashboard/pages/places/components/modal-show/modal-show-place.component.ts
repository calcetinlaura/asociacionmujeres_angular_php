import { CommonModule } from '@angular/common';
import { Component, Input } from '@angular/core';
import { PlaceModel } from 'src/app/core/interfaces/place.interface';
import { TypeList } from 'src/app/core/models/general.model';
import { TextBackgroundComponent } from 'src/app/shared/components/text/text-background/text-background.component';
import { TextSubTitleComponent } from 'src/app/shared/components/text/text-subTitle/text-subtitle.component';
import { TextTitleComponent } from 'src/app/shared/components/text/text-title/text-title.component';
import { TextIconComponent } from '../../../../../../shared/components/text/text-icon/text-icon.component';
import { TextEditorComponent } from '../../../../../../shared/components/text/text-editor/text-editor.component';

@Component({
  selector: 'app-modal-show-place',
  standalone: true,
  imports: [
    CommonModule,
    // TextBackgroundComponent,
    TextTitleComponent,
    TextSubTitleComponent,
    // TextIconComponent,
    // TextEditorComponent,
  ],
  templateUrl: './modal-show-place.component.html',
})
export class ModalShowPlaceComponent {
  @Input() item!: PlaceModel;
  type: TypeList = TypeList.Places;
}
