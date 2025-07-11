import { Component, Input } from '@angular/core';
import { PiteraModel } from 'src/app/core/interfaces/pitera.interface';
import { TypeList } from 'src/app/core/models/general.model';
import { TextSubTitleComponent } from 'src/app/shared/components/text/text-subTitle/text-subtitle.component';
import { TextTitleComponent } from 'src/app/shared/components/text/text-title/text-title.component';

@Component({
  selector: 'app-modal-show-pitera',
  imports: [TextTitleComponent, TextSubTitleComponent],
  templateUrl: './modal-show-pitera.component.html',
})
export class ModalShowPiteraComponent {
  @Input() item!: PiteraModel;
  type: TypeList = TypeList.Piteras;
}
