import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Input, OnInit, Output } from '@angular/core';
import { MacroeventModelFullData } from 'src/app/core/interfaces/macroevent.interface';
import { TypeList } from 'src/app/core/models/general.model';
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
  @Input() item?: MacroeventModelFullData;
  @Output() openEvent = new EventEmitter<number>();
  typeModal: TypeList = TypeList.Events;
  datesEquals = false;

  ngOnInit(): void {
    if (!this.item) return;

    if (this.item.start && this.item.end && this.item.start === this.item.end) {
      this.datesEquals = true;
    }
  }
  onOpenEvent(macroeventId: number) {
    console.log('ID EVENT en MACROEVENTO', macroeventId);
    if (macroeventId) {
      this.openEvent.emit(macroeventId);
    }
  }
}
