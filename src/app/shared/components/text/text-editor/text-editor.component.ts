import { CommonModule } from '@angular/common';
import { Component, inject, Input, OnInit } from '@angular/core';
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';

@Component({
    selector: 'app-text-editor',
    templateUrl: './text-editor.component.html',
    styleUrls: ['./text-editor.component.css'],
    imports: [CommonModule]
})
export class TextEditorComponent implements OnInit {
  sanitizer = inject(DomSanitizer);
  sanitizedDescription: SafeHtml = '';

  @Input() text?: string = '';
  @Input() number?: number = 36;

  ngOnInit() {
    this.sanitizedDescription = this.sanitizer.bypassSecurityTrustHtml(
      this.text || ''
    );
  }
}
