import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Input, Output } from '@angular/core';

@Component({
    selector: 'app-button-icon',
    templateUrl: './button-icon.component.html',
    styleUrls: ['./button-icon.component.css'],
    imports: [CommonModule]
})
export class ButtonIconComponent {
  @Input() buttonText: string = 'Nuevo Libro';
  @Input() iconClass: string = 'uil-plus';
  @Output() addClicked = new EventEmitter<void>();

  onAddClick() {
    this.addClicked.emit();
  }
}
