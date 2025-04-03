import { CommonModule } from '@angular/common';
import { Component, Input, OnChanges } from '@angular/core';
import { DomSanitizer, SafeResourceUrl } from '@angular/platform-browser';

@Component({
  standalone: true,
  selector: 'app-map',
  templateUrl: './map.component.html',
  imports: [CommonModule],
})
export class MapComponent implements OnChanges {
  @Input() lat!: number;
  @Input() lon!: number;

  safeMapUrl!: SafeResourceUrl;

  constructor(private sanitizer: DomSanitizer) {}

  ngOnChanges() {
    if (this.lat && this.lon) {
      const url = `https://maps.google.com/maps?q=${this.lat},${this.lon}&z=15&output=embed`;
      this.safeMapUrl = this.sanitizer.bypassSecurityTrustResourceUrl(url);
    }
  }
}
