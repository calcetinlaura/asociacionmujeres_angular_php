import { CommonModule } from '@angular/common';
import { Component, Input } from '@angular/core';
import { MatTooltipModule } from '@angular/material/tooltip';

@Component({
  standalone: true,
  selector: 'app-icon-action',
  templateUrl: './icon-action.component.html',
  styleUrls: ['./icon-action.component.css'],
  imports: [CommonModule, MatTooltipModule],
})
export class IconActionComponent {
  @Input() icon: string = 'uil-eye';
  @Input() tooltip: string = 'uil-eye';
}
