import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Output, Input } from '@angular/core';

@Component({
  standalone: true,
  selector: 'app-button-filter',
  templateUrl: './button-filter.component.html',
  styleUrls: ['./button-filter.component.css'],
  imports: [CommonModule],
})
export class ButtonFilterComponent {
  @Input() name!: string | number;
  @Input() isActive: boolean = false;
  @Output() filterClick = new EventEmitter<void>();

  onClick() {
    this.filterClick.emit();
  }
}
