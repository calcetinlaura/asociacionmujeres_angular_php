
import { Component, Input } from '@angular/core';

@Component({
    selector: 'app-text-link',
    templateUrl: './text-link.component.html',
    styleUrls: ['./text-link.component.css'],
    imports: []
})
export class TextLinkComponent {
  @Input() text: string = '';
  @Input() url?: string = '';
  @Input() number?: number = 11;
  @Input() colorBack?: string = '#cb8dd952';
  @Input() colorText?: string = 'black';
}
