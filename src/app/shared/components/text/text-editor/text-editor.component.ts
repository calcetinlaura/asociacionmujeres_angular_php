import { Component, inject, Input, OnInit } from '@angular/core';
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';

@Component({
  standalone: true,
  selector: 'app-text-editor',
  templateUrl: './text-editor.component.html',
  styleUrls: ['./text-editor.component.css'],
  imports: [],
})
export class TextEditorComponent implements OnInit {
  sanitizer = inject(DomSanitizer);
  sanitizedDescription: SafeHtml = '';

  @Input() text?: string = '';
  @Input() number?: number = 14;
  @Input() align?: 'right' | 'left' | 'center' | 'justify' = 'justify';
  @Input() color?: string = '';

  ngOnInit() {
    this.sanitizedDescription = this.sanitizer.bypassSecurityTrustHtml(
      this.text || ''
    );
  }
}
