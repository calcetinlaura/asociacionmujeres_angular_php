import { CommonModule } from '@angular/common';
import { Component, Input } from '@angular/core';

@Component({
  selector: 'app-text-subtitle',
  standalone: true,
  templateUrl: './text.subtitlecomponent.html',
  styleUrls: ['./text-subtitle.component.css'],
  imports: [CommonModule],
})
export class TextSubTitleComponent {
  @Input() text?: string | null = '';
  @Input() number?: number = 36;
}
