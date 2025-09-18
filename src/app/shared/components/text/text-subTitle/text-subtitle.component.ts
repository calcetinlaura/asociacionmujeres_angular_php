import { Component, inject, Input } from '@angular/core';
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';

@Component({
  selector: 'app-text-subtitle',
  templateUrl: './text.subtitlecomponent.html',
  styleUrls: ['./text-subtitle.component.css'],
  imports: [],
})
export class TextSubTitleComponent {
  sanitizer = inject(DomSanitizer);
  sanitizedDescription: SafeHtml = '';

  @Input() text?: string | null = '';
  @Input() number?: number = 18;
  @Input() align?: 'right' | 'left' | 'center' | 'justify' = 'center';
  @Input() color?: string = '';

  ngOnInit() {
    this.sanitizedDescription = this.sanitizer.bypassSecurityTrustHtml(
      this.text || ''
    );
  }
}
