import { Component, Input } from '@angular/core';

@Component({
  standalone: true,
  selector: 'app-social-media-share',
  templateUrl: './social-media-share.component.html',
  styleUrls: ['./social-media-share.component.css'],
  imports: [],
})
export class SocialMediaShareComponent {
  @Input() url: string = '';
  @Input() title: string = '';

  get encodedUrl() {
    return encodeURIComponent(this.url);
  }

  get encodedTitle() {
    return encodeURIComponent(this.title);
  }

  copyLink() {
    navigator.clipboard.writeText(this.url).then(() => {
      alert('Enlace copiado al portapapeles');
    });
  }
}
