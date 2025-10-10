import { Component, EventEmitter, Input, Output } from '@angular/core';
import { IconActionComponent } from '../buttons/icon-action/icon-action.component';

export type ActionType = 'view' | 'edit' | 'remove';
export interface ActionItem {
  icon: string;
  tooltip: string;
  type: ActionType;
  id: number;
}

@Component({
  selector: 'app-action-bar',
  standalone: true,
  imports: [IconActionComponent],
  templateUrl: './action-bar.component.html',
  styleUrls: ['./action-bar.component.css'],
})
export class ActionBarComponent {
  @Input() id!: number;
  @Output() view = new EventEmitter<number>();
  @Output() edit = new EventEmitter<number>();
  @Output() remove = new EventEmitter<number>();

  onAction(e: MouseEvent, type: 'view' | 'edit' | 'remove') {
    e.stopPropagation();
    if (type === 'view') this.view.emit(this.id);
    if (type === 'edit') this.edit.emit(this.id);
    if (type === 'remove') this.remove.emit(this.id);
  }
}
