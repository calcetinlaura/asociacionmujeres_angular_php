import { CommonModule } from '@angular/common';
import { Component, Input } from '@angular/core';

@Component({
  selector: 'app-sticky-zone',
  templateUrl: './sticky-zone.component.html',
  styleUrls: ['./sticky-zone.component.css'], // o .scss si prefieres
  standalone: true,
  imports: [CommonModule],
})
export class StickyZoneComponent {
  @Input() height: string | number = 246;

  getHeightValue(): string {
    return typeof this.height === 'number' ? `${this.height}px` : this.height;
  }
}
