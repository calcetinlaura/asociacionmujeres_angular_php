import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Output, Input } from '@angular/core';

@Component({
  standalone: true,
  selector: 'app-button-add',
  templateUrl: './button-add.component.html',
  styleUrls: ['./button-add.component.css'],
  imports: [CommonModule],
})
export class AddButtonComponent {
  @Input() buttonText: string = 'Nuevo Libro';
  @Input() iconClass: string = 'uil-plus';

  @Output() addClicked = new EventEmitter<void>();

  onAddClick() {
    this.addClicked.emit();
  }
}
