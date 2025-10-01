import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Input, Output } from '@angular/core';
import {
  EnumStatusEvent,
  EventModelFullData,
} from 'src/app/core/interfaces/event.interface';
import { TypeList } from 'src/app/core/models/general.model';
import { ImageZoomOverlayComponent } from 'src/app/shared/components/image-zoom-overlay/image-zoom-overlay.component';
import { MapComponent } from 'src/app/shared/components/map/map.component';
import { SocialMediaShareComponent } from 'src/app/shared/components/social-media/social-media-share.component';
import { TextBackgroundComponent } from 'src/app/shared/components/text/text-background/text-background.component';
import { TextEditorComponent } from 'src/app/shared/components/text/text-editor/text-editor.component';
import { TextSubTitleComponent } from 'src/app/shared/components/text/text-subTitle/text-subtitle.component';
import { TextTitleComponent } from 'src/app/shared/components/text/text-title/text-title.component';
import { AudienceBadgesPipe } from '../../../../../../shared/pipe/audience-badges.pipe';
import {
  DictTranslatePipe,
  DictType,
} from '../../../../../../shared/pipe/dict-translate.pipe';
import { FilterTransformCodePipe } from '../../../../../../shared/pipe/filterTransformCode.pipe';
import { ItemImagePipe } from '../../../../../../shared/pipe/item-img.pipe';

@Component({
  selector: 'app-modal-show-event',
  imports: [
    CommonModule,
    TextBackgroundComponent,
    TextTitleComponent,
    TextSubTitleComponent,
    TextEditorComponent,
    MapComponent,
    SocialMediaShareComponent,
    ItemImagePipe,
    FilterTransformCodePipe,
    DictTranslatePipe,
    AudienceBadgesPipe,
    ImageZoomOverlayComponent,
  ],
  templateUrl: './modal-show-event.component.html',
  styleUrls: ['./modal-show-event.component.css'],
})
export class ModalShowEventComponent {
  @Input() item!: EventModelFullData;
  @Output() openMacroevent = new EventEmitter<number>();
  typeModal: TypeList = TypeList.Events;
  enumStatusEnum = EnumStatusEvent;
  dictType = DictType;
  showZoom = false;

  onOpenMacroevent(macroeventId: number) {
    if (macroeventId) {
      this.openMacroevent.emit(macroeventId);
    }
  }
  openZoom() {
    this.showZoom = true;
  }
  closeZoom() {
    this.showZoom = false;
  }
}
