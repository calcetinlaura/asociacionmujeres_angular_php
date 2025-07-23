import { CommonModule } from '@angular/common';
import { Component, Input } from '@angular/core';
import { MatIconModule } from '@angular/material/icon';
import { PartnerModel } from 'src/app/core/interfaces/partner.interface';
import { TypeList } from 'src/app/core/models/general.model';
import { TextBackgroundComponent } from 'src/app/shared/components/text/text-background/text-background.component';
import { TextBorderComponent } from 'src/app/shared/components/text/text-border/text-border.component';
import { TextIconComponent } from 'src/app/shared/components/text/text-icon/text-icon.component';
import { TextSubTitleComponent } from 'src/app/shared/components/text/text-subTitle/text-subtitle.component';
import { TextTitleComponent } from 'src/app/shared/components/text/text-title/text-title.component';
import { CalculateAgePipe } from 'src/app/shared/pipe/caculate_age.pipe';
import { PhoneFormatPipe } from 'src/app/shared/pipe/phoneFormat.pipe';
@Component({
  selector: 'app-modal-show-partner',
  imports: [
    CommonModule,
    CalculateAgePipe,
    MatIconModule,
    TextBackgroundComponent,
    TextTitleComponent,
    TextBorderComponent,
    TextSubTitleComponent,
    TextIconComponent,
    PhoneFormatPipe,
  ],
  templateUrl: './modal-show-partner.component.html',
})
export class ModalShowPartnerComponent {
  @Input() item!: PartnerModel;
  typeModal: TypeList = TypeList.Partners;
}
