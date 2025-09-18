import { Component, Input } from '@angular/core';

@Component({
  selector: 'app-text-background',
  templateUrl: './text-background.component.html',
  styleUrls: ['./text-background.component.css'],
  imports: [],
})
export class TextBackgroundComponent {
  @Input() text: string | null = '';
  @Input() number?: number = 11;
  @Input() colorBack?: string = '#EEE1FF';
  @Input() colorText?: string = 'black';
}
