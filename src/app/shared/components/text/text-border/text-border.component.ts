
import { Component, Input } from '@angular/core';

@Component({
    selector: 'app-text-border',
    templateUrl: './text.border.component.html',
    styleUrls: ['./text-border.component.css'],
    imports: []
})
export class TextBorderComponent {
  @Input() text?: string | null | number = '';
  @Input() number?: number = 11;
  @Input() colorBorder?: string = '#cb8dd952';
  borderStyle: string = '1px solid';
}
