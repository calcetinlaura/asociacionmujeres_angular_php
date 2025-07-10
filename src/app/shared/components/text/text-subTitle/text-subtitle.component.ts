
import { Component, Input } from '@angular/core';

@Component({
    selector: 'app-text-subtitle',
    templateUrl: './text.subtitlecomponent.html',
    styleUrls: ['./text-subtitle.component.css'],
    imports: []
})
export class TextSubTitleComponent {
  @Input() text?: string | null = '';
  @Input() number?: number = 36;
}
