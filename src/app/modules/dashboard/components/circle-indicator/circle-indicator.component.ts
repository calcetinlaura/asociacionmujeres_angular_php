import { CommonModule } from '@angular/common';
import { Component, Input } from '@angular/core';
import { MatIconModule } from '@angular/material/icon';
@Component({
  standalone: true,
  selector: 'app-circle-indicator',
  templateUrl: './circle-indicator.component.html',
  styleUrls: ['./circle-indicator.component.css'],
  imports: [CommonModule, MatIconModule],
})
export class CircleIndicatorComponent {
  @Input() item: boolean | null = false;
}
