import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Output, Input } from '@angular/core';

@Component({
  standalone: true,
  selector: 'app-button',
  templateUrl: './button.component.html',
  styleUrls: ['./button.component.css'],
  imports: [CommonModule],
})
export class ButtonComponent {
  @Input() buttonText: string = '';

  @Output() addClicked = new EventEmitter<void>();

  onAddClick() {
    this.addClicked.emit();
  }
}
