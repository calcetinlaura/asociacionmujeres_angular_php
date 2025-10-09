import { CommonModule, TitleCasePipe } from '@angular/common';
import { Component, EventEmitter, Input, OnInit, Output } from '@angular/core';
import { MacroeventModelFullData } from 'src/app/core/interfaces/macroevent.interface';
import { TypeList } from 'src/app/core/models/general.model';
import { ImageZoomOverlayComponent } from 'src/app/shared/components/image-zoom-overlay/image-zoom-overlay.component';
import { SocialMediaShareComponent } from 'src/app/shared/components/social-media/social-media-share.component';
import { TextEditorComponent } from 'src/app/shared/components/text/text-editor/text-editor.component';
import { TextSubTitleComponent } from 'src/app/shared/components/text/text-subTitle/text-subtitle.component';
import { TextTitleComponent } from 'src/app/shared/components/text/text-title/text-title.component';
import {
  DictTranslatePipe,
  DictType,
} from '../../../../../../shared/pipe/dict-translate.pipe';
import { FilterTransformCodePipe } from '../../../../../../shared/pipe/filterTransformCode.pipe';
import { ItemImagePipe } from '../../../../../../shared/pipe/item-img.pipe';

@Component({
  selector: 'app-modal-show-macroevent',
  imports: [
    CommonModule,
    TextTitleComponent,
    TextEditorComponent,
    TextSubTitleComponent,
    ItemImagePipe,
    SocialMediaShareComponent,
    TitleCasePipe,
    ImageZoomOverlayComponent,
    DictTranslatePipe,
    FilterTransformCodePipe,
  ],
  templateUrl: './modal-show-macroevent.component.html',
  styleUrls: ['./modal-show-macroevent.component.css'],
})
export class ModalShowMacroeventComponent implements OnInit {
  @Input() item?: MacroeventModelFullData;
  @Output() openEvent = new EventEmitter<number>();
  @Input() isDashboard = false;
  typeModal: TypeList = TypeList.Macroevents;
  typeEvent: TypeList = TypeList.Events;
  datesEquals = false;
  showZoom = false;
  dictType = DictType;

  ngOnInit(): void {
    if (!this.item) return;

    if (this.item.start && this.item.end && this.item.start === this.item.end) {
      this.datesEquals = true;
    }
  }
  onOpenEvent(macroeventId: number) {
    if (macroeventId) {
      this.openEvent.emit(macroeventId);
    }
  }
  openZoom() {
    this.showZoom = true;
  }
  closeZoom() {
    this.showZoom = false;
  }
}
