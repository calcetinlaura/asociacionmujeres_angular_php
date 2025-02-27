import { CommonModule } from '@angular/common';
import { Component, Input } from '@angular/core';

@Component({
  standalone: true,
  selector: 'app-circle-indicator',
  templateUrl: './circle-indicator.component.html',
  styleUrls: ['./circle-indicator.component.css'],
  imports: [CommonModule],
})
export class CircleIndicatorComponent {
  @Input() item: boolean | null = false;
}
