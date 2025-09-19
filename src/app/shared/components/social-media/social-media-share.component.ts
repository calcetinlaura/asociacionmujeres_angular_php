import { isPlatformBrowser } from '@angular/common';
import { Component, inject, Input, PLATFORM_ID } from '@angular/core';

@Component({
  standalone: true,
  selector: 'app-social-media-share',
  templateUrl: './social-media-share.component.html',
  styleUrls: ['./social-media-share.component.css'],
  imports: [],
})
export class SocialMediaShareComponent {
  private readonly platformId = inject(PLATFORM_ID);

  /** URL a compartir. Si no se pasa, usa la URL actual */
  @Input() url = '';
  /** Título principal. Si no se pasa, usa document.title */
  @Input() title = '';
  /** Texto opcional (p. ej. descripción corta) */
  @Input() text = '';
  /** Hashtags opcionales para X/Twitter (sin #) */
  @Input() hashtags: string[] = [];
  /** Cuenta opcional para X/Twitter (sin @), ej. "mimarca" */
  @Input() via = '';

  get isBrowser() {
    return isPlatformBrowser(this.platformId);
  }

  // URL y título efectivos (con fallback seguro para SSR)
  get resolvedUrl(): string {
    if (!this.isBrowser) return this.url || '';
    return this.url || window.location.href;
  }
  get resolvedTitle(): string {
    if (!this.isBrowser) return this.title || '';
    return this.title || document.title || '';
  }
  get resolvedText(): string {
    return this.text || '';
  }

  // Versiones codificadas
  get encodedUrl() {
    return encodeURIComponent(this.resolvedUrl);
  }
  get encodedTitle() {
    return encodeURIComponent(this.resolvedTitle);
  }
  get encodedText() {
    return encodeURIComponent(this.resolvedText);
  }
  get encodedHashtags() {
    return encodeURIComponent(this.hashtags.join(','));
  }
  get encodedVia() {
    return encodeURIComponent(this.via);
  }

  // Enlaces de plataformas
  get twitterHref() {
    const parts = [
      `url=${this.encodedUrl}`,
      this.resolvedTitle ? `text=${this.encodedTitle}` : null,
      this.via ? `via=${this.encodedVia}` : null,
      this.hashtags.length ? `hashtags=${this.encodedHashtags}` : null,
    ]
      .filter(Boolean)
      .join('&');
    return `https://twitter.com/intent/tweet?${parts}`;
  }
  get whatsappHref() {
    // WhatsApp usa un único parámetro text
    const text = [
      this.resolvedTitle || '',
      this.resolvedText || '',
      this.resolvedUrl,
    ]
      .filter(Boolean)
      .join(' - ');
    return `https://api.whatsapp.com/send?text=${encodeURIComponent(text)}`;
  }
  get telegramHref() {
    const text = this.resolvedText || this.resolvedTitle || '';
    return `https://t.me/share/url?url=${
      this.encodedUrl
    }&text=${encodeURIComponent(text)}`;
  }
  get facebookHref() {
    return `https://www.facebook.com/sharer/sharer.php?u=${this.encodedUrl}`;
  }
  get linkedinHref() {
    const parts = [
      `url=${this.encodedUrl}`,
      this.resolvedTitle ? `title=${this.encodedTitle}` : null,
      this.resolvedText ? `summary=${this.encodedText}` : null,
      'mini=true',
    ]
      .filter(Boolean)
      .join('&');
    return `https://www.linkedin.com/shareArticle?${parts}`;
  }
  get emailHref() {
    const subject = this.resolvedTitle || 'Mira esto';
    const body = [
      this.resolvedText || this.resolvedTitle || '',
      this.resolvedUrl,
    ]
      .filter(Boolean)
      .join('\n\n');
    return `mailto:?subject=${encodeURIComponent(
      subject
    )}&body=${encodeURIComponent(body)}`;
  }

  async nativeShare() {
    if (!this.isBrowser) return;
    if (navigator.share) {
      try {
        await navigator.share({
          title: this.resolvedTitle,
          text: this.resolvedText || this.resolvedTitle,
          url: this.resolvedUrl,
        });
      } catch {
        // usuario canceló o no se pudo; sin ruido
      }
    } else {
      this.copyLink();
    }
  }

  async copyLink() {
    if (!this.isBrowser) return;
    const toCopy = this.resolvedUrl;

    // Intento con Clipboard API
    if (navigator.clipboard && window.isSecureContext) {
      try {
        await navigator.clipboard.writeText(toCopy);
        this.toast('Enlace copiado al portapapeles');
        return;
      } catch {
        /* fallback abajo */
      }
    }

    // Fallback compatible (textarea + execCommand)
    const textArea = document.createElement('textarea');
    textArea.value = toCopy;
    textArea.setAttribute('readonly', '');
    textArea.style.position = 'fixed';
    textArea.style.opacity = '0';
    document.body.appendChild(textArea);
    textArea.select();
    try {
      document.execCommand('copy');
      this.toast('Enlace copiado al portapapeles');
    } catch {
      this.toast('No se pudo copiar. Copia manualmente:', toCopy);
    } finally {
      document.body.removeChild(textArea);
    }
  }

  // Cambia esto por tu sistema de toasts/snackbar
  private toast(msg: string, extra?: string) {
    alert(extra ? `${msg}\n${extra}` : msg);
  }
}
