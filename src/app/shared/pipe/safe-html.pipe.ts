import { Pipe, PipeTransform, inject } from '@angular/core';
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';
import DOMPurify from 'dompurify';

@Pipe({ name: 'safeHtml', standalone: true })
export class SafeHtmlPipe implements PipeTransform {
  private sanitizer = inject(DomSanitizer);

  transform(value: string | null | undefined): SafeHtml {
    if (!value) return '';
    const clean = DOMPurify.sanitize(value, {
      // Ajusta según lo que quieras permitir
      ALLOWED_TAGS: [
        'b',
        'i',
        'em',
        'strong',
        'u',
        'p',
        'br',
        'ul',
        'ol',
        'li',
        'span',
        'a',
        'h1',
        'h2',
        'h3',
        'blockquote',
        'code',
        'pre',
        'img',
      ],
      ALLOWED_ATTR: [
        'href',
        'target',
        'rel',
        'class',
        'alt',
        'title',
        'src',
        'width',
        'height',
        'style',
        'align',
      ],
      // Permite http(s), mailto y data:image para imágenes embebidas (si lo necesitas)
      ALLOWED_URI_REGEXP:
        /^(?:(?:https?|mailto|data:image\/(?:png|jpg|jpeg|gif|webp));)/i,
    });
    return this.sanitizer.bypassSecurityTrustHtml(clean);
  }
}
