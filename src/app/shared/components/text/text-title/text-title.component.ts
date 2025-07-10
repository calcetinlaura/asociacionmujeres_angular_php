
import { Component, Input } from '@angular/core';

@Component({
    selector: 'app-text-title',
    templateUrl: './text.titlecomponent.html',
    styleUrls: ['./text-title.component.css'],
    imports: []
})
export class TextTitleComponent {
  @Input() text?: string = '';
  @Input() number?: number = 36;
}
