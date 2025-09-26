import { CommonModule } from '@angular/common';
import { Component, Input } from '@angular/core';
import { MatIconModule } from '@angular/material/icon';
import { PartnerModel } from 'src/app/core/interfaces/partner.interface';
import { TypeList } from 'src/app/core/models/general.model';
import { ImageZoomOverlayComponent } from 'src/app/shared/components/image-zoom-overlay/image-zoom-overlay.component';
import { TextBackgroundComponent } from 'src/app/shared/components/text/text-background/text-background.component';
import { TextBorderComponent } from 'src/app/shared/components/text/text-border/text-border.component';
import { TextIconComponent } from 'src/app/shared/components/text/text-icon/text-icon.component';
import { TextTitleComponent } from 'src/app/shared/components/text/text-title/text-title.component';
import { CalculateAgePipe } from 'src/app/shared/pipe/caculate_age.pipe';
import { PhoneFormatPipe } from 'src/app/shared/pipe/phoneFormat.pipe';
import { ItemImagePipe } from '../../../../../../shared/pipe/item-img.pipe';
@Component({
  selector: 'app-modal-show-partner',
  imports: [
    CommonModule,
    CalculateAgePipe,
    MatIconModule,
    TextBackgroundComponent,
    TextTitleComponent,
    TextBorderComponent,
    TextIconComponent,
    PhoneFormatPipe,
    ItemImagePipe,
    ImageZoomOverlayComponent,
  ],
  templateUrl: './modal-show-partner.component.html',
})
export class ModalShowPartnerComponent {
  @Input() item!: PartnerModel;
  typeModal: TypeList = TypeList.Partners;
  showZoom = false;
  openZoom() {
    this.showZoom = true;
  }
  closeZoom() {
    this.showZoom = false;
  }

  getYearsText(item: any) {
    const n = item?.cuotas?.length ?? 0;
    return `${n} ${n === 1 ? 'año' : 'años'} en la asociación`;
  }
}
