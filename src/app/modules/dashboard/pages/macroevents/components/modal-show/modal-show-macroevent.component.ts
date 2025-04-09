import { CommonModule } from '@angular/common';
import { Component, inject, Input } from '@angular/core';
import { tap } from 'rxjs';
import { EventModelFullData } from 'src/app/core/interfaces/event.interface';
import { MacroeventModel } from 'src/app/core/interfaces/macroevent.interface';
import { TypeList } from 'src/app/core/models/general.model';
import { EventsService } from 'src/app/core/services/events.services';
import { TextBackgroundComponent } from 'src/app/shared/components/text/text-background/text-background.component';
import { TextEditorComponent } from 'src/app/shared/components/text/text-editor/text-editor.component';
import { TextTitleComponent } from 'src/app/shared/components/text/text-title/text-title.component';
import { TextSubTitleComponent } from '../../../../../../shared/components/text/text-subTitle/text-subtitle.component';

@Component({
  selector: 'app-modal-show-macroevent',
  standalone: true,
  imports: [
    CommonModule,
    TextBackgroundComponent,
    TextTitleComponent,
    TextEditorComponent,
    TextSubTitleComponent,
  ],
  templateUrl: './modal-show-macroevent.component.html',
  styleUrls: ['./modal-show-macroevent.component.css'],
})
export class ModalShowMacroeventComponent {
  private readonly eventsService = inject(EventsService);
  @Input() item!: MacroeventModel;
  type: TypeList = TypeList.Macroevents;
  datesEquals = false;
  eventsOfMacro: EventModelFullData[] = [];

  ngOnInit(): void {
    if (this.item.start && this.item.end) {
      if (this.item.start === this.item.end) {
        this.datesEquals === true;
      }
    }
    if (this.item.id) {
      this.eventsService
        .getEventsByMacroevent(this.item.id)
        .pipe(
          tap((events) => {
            this.eventsOfMacro = this.eventsService.sortEventsByDate(events);
          })
        )
        .subscribe();
    }
  }
}
