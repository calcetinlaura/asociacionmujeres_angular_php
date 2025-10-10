import {
  ChangeDetectionStrategy,
  Component,
  EventEmitter,
  Input,
  Output,
} from '@angular/core';
import { IconActionComponent } from '../buttons/icon-action/icon-action.component';

export type ActionType =
  | 'view'
  | 'edit'
  | 'remove'
  | 'duplicate'
  | 'download-image'
  | 'print'
  | 'download-pdfs';

export interface ActionItem {
  icon: string;
  tooltip: string;
  type: ActionType;
}

export interface ActionPayload {
  type: ActionType;
  id: number;
}

@Component({
  selector: 'app-action-bar',
  standalone: true,
  imports: [IconActionComponent],
  templateUrl: './action-bar.component.html',
  styleUrls: ['./action-bar.component.css'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ActionBarComponent {
  @Input({ required: true }) id!: number;
  @Input() actions: ReadonlyArray<ActionItem> = [];

  @Output() action = new EventEmitter<ActionPayload>();

  trackByType = (_: number, a: ActionItem) => a.type;

  onAction(e: MouseEvent, a: ActionItem) {
    e.stopPropagation();
    this.action.emit({ type: a.type, id: this.id });
  }
}
