import { CommonModule } from '@angular/common';
import { Component, Input } from '@angular/core';
import { EventModel } from 'src/app/core/interfaces/event.interface';
import { TypeList } from 'src/app/core/models/general.model';
import { TextBackgroundComponent } from 'src/app/shared/components/text/text-background/text-background.component';
import { TextBorderComponent } from 'src/app/shared/components/text/text-border/text-border.component';
import { TextEditorComponent } from 'src/app/shared/components/text/text-editor/text-editor.component';
import { TextSubTitleComponent } from 'src/app/shared/components/text/text-subTitle/text-subtitle.component';
import { TextTitleComponent } from 'src/app/shared/components/text/text-title/text-title.component';

@Component({
  selector: 'app-modal-show-event',
  standalone: true,
  imports: [
    CommonModule,
    TextBackgroundComponent,
    TextBorderComponent,
    TextTitleComponent,
    TextSubTitleComponent,
    TextEditorComponent,
  ],
  templateUrl: './modal-show-event.component.html',
  styleUrls: ['./modal-show-event.component.css'],
})
export class ModalShowEventComponent {
  @Input() item!: EventModel;
  type: TypeList = TypeList.Events;
  datesEquals = false;

  ngOnInit(): void {
    if (this.item.start && this.item.end) {
      if (this.item.start === this.item.end) {
        this.datesEquals === true;
      }
    }
  }
}
