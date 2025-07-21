import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Input, Output } from '@angular/core';
import { MatIconModule } from '@angular/material/icon';

@Component({
  standalone: true,
  selector: 'app-button-select',
  templateUrl: './button-select.component.html',
  styleUrls: ['./button-select.component.css'],
  imports: [CommonModule, MatIconModule],
})
export class ButtonSelectComponent {
  @Input() buttonText: string = 'Nuevo Libro';
  @Input() iconClass?: string = '';
  @Input() active = false;
  @Input() subText = '';
  @Output() addClicked = new EventEmitter<void>();

  onAddClick() {
    this.addClicked.emit();
  }
}
