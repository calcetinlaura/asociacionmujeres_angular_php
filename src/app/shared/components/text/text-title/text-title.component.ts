import { CommonModule } from '@angular/common';
import { Component, Input } from '@angular/core';

@Component({
  selector: 'app-text-title',
  standalone: true,
  templateUrl: './text.titlecomponent.html',
  styleUrls: ['./text-title.component.css'],
  imports: [CommonModule],
})
export class TextTitleComponent {
  @Input() text: string = '';
  @Input() number?: number = 36;
}
