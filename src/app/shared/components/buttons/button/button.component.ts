import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Input, Output } from '@angular/core';
import { MatMenuModule } from '@angular/material/menu';
@Component({
  standalone: true,
  selector: 'app-button',
  templateUrl: './button.component.html',
  styleUrls: ['./button.component.css'],
  imports: [CommonModule, MatMenuModule],
})
export class ButtonComponent {
  @Input() buttonText: string = '';
  @Input() menu: any; // <- Para matMenuTriggerFor

  @Output() addClicked = new EventEmitter<void>();

  onAddClick() {
    this.addClicked.emit();
  }
}
