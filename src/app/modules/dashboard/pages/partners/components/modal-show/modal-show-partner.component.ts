import { CommonModule } from '@angular/common';
import { Component, Input } from '@angular/core';
import { MatIconModule } from '@angular/material/icon';
import {
  CuotaModel,
  PartnerModel,
} from 'src/app/core/interfaces/partner.interface';
import { TypeList } from 'src/app/core/models/general.model';
import { ImageZoomOverlayComponent } from 'src/app/shared/components/image-zoom-overlay/image-zoom-overlay.component';
import { TextBackgroundComponent } from 'src/app/shared/components/text/text-background/text-background.component';
import { TextBorderComponent } from 'src/app/shared/components/text/text-border/text-border.component';
import { TextIconComponent } from 'src/app/shared/components/text/text-icon/text-icon.component';
import { TextTitleComponent } from 'src/app/shared/components/text/text-title/text-title.component';
import { AgePipe } from 'src/app/shared/pipe/caculate_age.pipe';
import {
  DictTranslatePipe,
  DictType,
} from 'src/app/shared/pipe/dict-translate.pipe';
import { ItemImagePipe } from 'src/app/shared/pipe/item-img.pipe';
import { PhoneFormatPipe } from 'src/app/shared/pipe/phoneFormat.pipe';
import {
  getMembershipYearsText,
  methodLabel,
  normalizeCuotas,
} from 'src/app/shared/utils/cuotas.utils';

@Component({
  selector: 'app-modal-show-partner',
  imports: [
    CommonModule,
    MatIconModule,
    TextBackgroundComponent,
    TextTitleComponent,
    TextBorderComponent,
    TextIconComponent,
    PhoneFormatPipe,
    ItemImagePipe,
    ImageZoomOverlayComponent,
    AgePipe,
    DictTranslatePipe,
  ],
  templateUrl: './modal-show-partner.component.html',
})
export class ModalShowPartnerComponent {
  @Input() item!: PartnerModel;
  typeModal: TypeList = TypeList.Partners;
  showZoom = false;
  dictType = DictType;

  openZoom() {
    this.showZoom = true;
  }
  closeZoom() {
    this.showZoom = false;
  }

  /** Cuotas ya normalizadas para la vista */
  get cuotasView(): CuotaModel[] {
    return normalizeCuotas(this.item?.cuotas);
  }

  getYearsText(item: PartnerModel) {
    // true => cuenta solo pagadas; pon false si quieres contar todas las filas
    return getMembershipYearsText(normalizeCuotas(item?.cuotas), true);
  }

  methodText(m: CuotaModel['method_payment']) {
    return methodLabel(m);
  }
  get cuotasPaidView() {
    return this.cuotasView.filter((c) => c.paid);
  }
}
