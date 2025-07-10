import { CommonModule } from '@angular/common';
import { Component, Input } from '@angular/core';
import {
  EnumStatusEvent,
  EventModelFullData,
} from 'src/app/core/interfaces/event.interface';
import { TypeList } from 'src/app/core/models/general.model';
import { MapComponent } from 'src/app/shared/components/map/map.component';
import { TextBackgroundComponent } from 'src/app/shared/components/text/text-background/text-background.component';
import { TextBorderComponent } from 'src/app/shared/components/text/text-border/text-border.component';
import { TextEditorComponent } from 'src/app/shared/components/text/text-editor/text-editor.component';
import { TextSubTitleComponent } from 'src/app/shared/components/text/text-subTitle/text-subtitle.component';
import { TextTitleComponent } from 'src/app/shared/components/text/text-title/text-title.component';

@Component({
    selector: 'app-modal-show-event',
    imports: [
        CommonModule,
        TextBackgroundComponent,
        TextBorderComponent,
        TextTitleComponent,
        TextSubTitleComponent,
        TextEditorComponent,
        MapComponent,
    ],
    templateUrl: './modal-show-event.component.html',
    styleUrls: ['./modal-show-event.component.css']
})
export class ModalShowEventComponent {
  @Input() item!: EventModelFullData;
  type: TypeList = TypeList.Events;
  datesEquals = false;
  enumStatusEnum = EnumStatusEvent;

  ngOnInit(): void {
    if (this.item.start && this.item.end) {
      if (this.item.start === this.item.end) {
        this.datesEquals === true;
      }
    }
  }
}
