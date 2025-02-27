import { CommonModule } from '@angular/common';
import { Component, Input } from '@angular/core';
import { CreditorModel } from 'src/app/core/interfaces/creditor.interface';
import { TypeList } from 'src/app/core/models/general.model';
import { TextBackgroundComponent } from 'src/app/shared/components/text/text-background/text-background.component';
import { TextSubTitleComponent } from 'src/app/shared/components/text/text-subTitle/text-subtitle.component';
import { TextTitleComponent } from 'src/app/shared/components/text/text-title/text-title.component';
import { TextIconComponent } from '../../../../../../shared/components/text/text-icon/text-icon.component';

@Component({
  selector: 'app-modal-show-creditor',
  standalone: true,
  imports: [
    CommonModule,
    TextBackgroundComponent,
    TextTitleComponent,
    TextSubTitleComponent,
    TextIconComponent,
  ],
  templateUrl: './modal-show-creditor.component.html',
})
export class ModalShowCreditorComponent {
  @Input() item!: CreditorModel;
  type: TypeList = TypeList.Creditors;
}
