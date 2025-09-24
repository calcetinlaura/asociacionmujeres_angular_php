import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Input, Output } from '@angular/core';
import { MatIconModule } from '@angular/material/icon';
import { CategoryCode } from 'src/app/core/interfaces/event.interface';

@Component({
  standalone: true,
  selector: 'app-button-category',
  templateUrl: './button-category.component.html',
  styleUrls: ['./button-category.component.css'],
  imports: [CommonModule, MatIconModule],
})
export class ButtonCategoryComponent {
  @Input() code!: CategoryCode;
  @Input() buttonText = 'Nuevo Libro';
  @Input() iconClass?: string = '';
  @Input() active = false;
  @Input() subText = '';
  @Output() addClicked = new EventEmitter<CategoryCode>();

  onAddClick() {
    this.addClicked.emit(this.code);
  }
}
