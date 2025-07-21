import { CommonModule } from '@angular/common';
import { Component, inject, Input, OnInit } from '@angular/core';
import { MacroeventModelFullData } from 'src/app/core/interfaces/macroevent.interface';
import { TypeList } from 'src/app/core/models/general.model';
import { EventsService } from 'src/app/core/services/events.services';
import { TextBackgroundComponent } from 'src/app/shared/components/text/text-background/text-background.component';
import { TextEditorComponent } from 'src/app/shared/components/text/text-editor/text-editor.component';
import { TextSubTitleComponent } from 'src/app/shared/components/text/text-subTitle/text-subtitle.component';
import { TextTitleComponent } from 'src/app/shared/components/text/text-title/text-title.component';
import { ItemImagePipe } from '../../../../../../shared/pipe/item-img.pipe';

@Component({
  selector: 'app-modal-show-macroevent',
  imports: [
    CommonModule,
    TextBackgroundComponent,
    TextTitleComponent,
    TextEditorComponent,
    TextSubTitleComponent,
    ItemImagePipe,
  ],
  templateUrl: './modal-show-macroevent.component.html',
  styleUrls: ['./modal-show-macroevent.component.css'],
})
export class ModalShowMacroeventComponent implements OnInit {
  private readonly eventsService = inject(EventsService);
  @Input() item?: MacroeventModelFullData;
  type: TypeList = TypeList.Macroevents;
  datesEquals = false;

  ngOnInit(): void {
    if (!this.item) return;

    if (this.item.start && this.item.end && this.item.start === this.item.end) {
      this.datesEquals = true;
    }
  }
}
