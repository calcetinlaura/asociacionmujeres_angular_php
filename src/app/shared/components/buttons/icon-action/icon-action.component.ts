import { CommonModule } from '@angular/common';
import { Component, Input } from '@angular/core';

@Component({
  selector: 'app-icon-action',
  standalone: true,
  templateUrl: './icon-action.component.html',
  styleUrls: ['./icon-action.component.css'],
  imports: [CommonModule],
})
export class IconActionComponent {
  @Input() icon: string = 'uil-eye';
}
