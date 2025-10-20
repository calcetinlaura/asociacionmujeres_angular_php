import { Pipe, PipeTransform } from '@angular/core';
import { DomSanitizer, SafeResourceUrl } from '@angular/platform-browser';

@Pipe({ name: 'youtubeEmbed', standalone: true })
export class YoutubeEmbedPipe implements PipeTransform {
  constructor(private sanitizer: DomSanitizer) {}

  transform(input?: string | null): SafeResourceUrl {
    if (!input) {
      return this.sanitizer.bypassSecurityTrustResourceUrl('');
    }
    const id = this.extractId(input);
    const embed = id ? `https://www.youtube.com/embed/${id}` : input;
    return this.sanitizer.bypassSecurityTrustResourceUrl(embed);
  }

  /** Extrae el ID (11 chars) de varias formas de URL de YouTube */
  private extractId(url: string): string | null {
    const patterns = [
      /youtu\.be\/([A-Za-z0-9_-]{11})/, // https://youtu.be/VIDEOID
      /youtube\.com\/watch\?.*v=([A-Za-z0-9_-]{11})/, // https://www.youtube.com/watch?v=VIDEOID
      /youtube\.com\/embed\/([A-Za-z0-9_-]{11})/, // https://www.youtube.com/embed/VIDEOID
      /youtube\.com\/shorts\/([A-Za-z0-9_-]{11})/, // https://www.youtube.com/shorts/VIDEOID
      /youtube\.com\/live\/([A-Za-z0-9_-]{11})/, // https://www.youtube.com/live/VIDEOID
    ];
    for (const rx of patterns) {
      const m = url.match(rx);
      if (m?.[1]) return m[1];
    }
    // fallback: intenta coger v= si no coincide long
    const vParam = new URLSearchParams(url.split('?')[1] || '').get('v');
    return vParam && /^[A-Za-z0-9_-]{11}$/.test(vParam) ? vParam : null;
  }
}
