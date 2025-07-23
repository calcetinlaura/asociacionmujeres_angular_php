import { Component, inject, Input } from '@angular/core';
import { tap } from 'rxjs';
import { EventModelFullData } from 'src/app/core/interfaces/event.interface';
import { ProjectModel } from 'src/app/core/interfaces/project.interface';
import { TypeList } from 'src/app/core/models/general.model';
import { EventsService } from 'src/app/core/services/events.services';
import { TextTitleComponent } from 'src/app/shared/components/text/text-title/text-title.component';

@Component({
  selector: 'app-modal-show-project',
  imports: [TextTitleComponent],
  templateUrl: './modal-show-project.component.html',
  styleUrls: ['./modal-show-project.component.css'],
})
export class ModalShowProjectComponent {
  private readonly eventsService = inject(EventsService);
  @Input() item!: ProjectModel;
  typeModal: TypeList = TypeList.Projects;
  datesEquals = false;
  eventsOfMacro: EventModelFullData[] = [];

  ngOnInit(): void {
    if (this.item.id) {
      this.eventsService
        .getEventsByProject(this.item.id)
        .pipe(
          tap((events) => {
            this.eventsOfMacro = this.eventsService.sortEventsByDate(events);
          })
        )
        .subscribe();
    }
  }
}
