import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Input, Output } from '@angular/core';
import { EventModelFullData } from 'src/app/core/interfaces/event.interface';
import { TypeList } from 'src/app/core/models/general.model';
import { EventPublishPillComponent } from 'src/app/modules/dashboard/pages/events/components/publish-pill/publish-pill.component';
import {
  ActionBarComponent,
  ActionItem,
  ActionType,
} from 'src/app/shared/components/action-bar/action-bar.component';
import {
  DictTranslatePipe,
  DictType,
} from 'src/app/shared/pipe/dict-translate.pipe';
import { FilterTransformCodePipe } from 'src/app/shared/pipe/filterTransformCode.pipe';
import { ItemImagePipe } from 'src/app/shared/pipe/item-img.pipe';

@Component({
  selector: 'app-card-events-mini',
  standalone: true,
  templateUrl: './card-events-mini.component.html',
  styleUrls: ['./card-events-mini.component.css'],
  imports: [
    CommonModule,
    ItemImagePipe,
    DictTranslatePipe,
    FilterTransformCodePipe,
    ActionBarComponent,
    EventPublishPillComponent,
  ],
})
export class CardEventMiniComponent {
  @Input({ required: true }) event!: EventModelFullData;
  @Input() isDashboard = false;
  @Input() showButtonsActions = false;
  @Input() type: TypeList = TypeList.Events;

  /** Emite cuando se hace clic en la tarjeta */
  @Output() openEvent = new EventEmitter<number>();

  /** Emite cuando se selecciona una acción (ver, editar, eliminar) */
  @Output() actionEvent = new EventEmitter<{
    type: ActionType;
    event: EventModelFullData;
  }>();

  dictType = DictType;
  typeList = TypeList;

  readonly actionsForSection: ActionItem[] = [
    { icon: 'uil-eye', tooltip: 'Ver', type: 'view' },
    { icon: 'uil-edit', tooltip: 'Editar', type: 'edit' },
    { icon: 'uil-trash-alt', tooltip: 'Eliminar', type: 'remove' },
  ];

  onOpenEvent(id: number) {
    if (id) this.openEvent.emit(id);
  }

  handleAction(action: { type: ActionType }) {
    if (action?.type) {
      this.actionEvent.emit({
        type: action.type,
        event: this.event,
      });
    }
  }
}
