import { CommonModule } from '@angular/common';
import { Component, Input } from '@angular/core';

@Component({
  selector: 'app-text-icon',
  templateUrl: './text-icon.component.html',
  styleUrls: ['./text-icon.component.css'],
  imports: [CommonModule],
})
export class TextIconComponent {
  @Input() text?: string = '';
  @Input() number?: number = 12;
  @Input() icon?: string = '';
}
