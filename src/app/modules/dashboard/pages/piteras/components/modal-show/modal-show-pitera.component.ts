import { CommonModule } from '@angular/common';
import { Component, Input } from '@angular/core';
import { PiteraModel } from 'src/app/core/interfaces/pitera.interface';
import { TypeList } from 'src/app/core/models/general.model';
import { ImagenModal } from 'src/app/shared/components/modal/components/img-modal/img-modal.components';
import { TextBackgroundComponent } from 'src/app/shared/components/text/text-background/text-background.component';
import { TextLinkComponent } from 'src/app/shared/components/text/text-link/text-link.component';
import { TextSubTitleComponent } from 'src/app/shared/components/text/text-subTitle/text-subtitle.component';
import { TextTitleComponent } from 'src/app/shared/components/text/text-title/text-title.component';
import { ItemImagePipe } from 'src/app/shared/pipe/item-img.pipe';

@Component({
    selector: 'app-modal-show-pitera',
    imports: [
        CommonModule,
        TextLinkComponent,
        TextTitleComponent,
        TextSubTitleComponent,
    ],
    templateUrl: './modal-show-pitera.component.html'
})
export class ModalShowPiteraComponent {
  @Input() item!: PiteraModel;
  type: TypeList = TypeList.Piteras;
}
