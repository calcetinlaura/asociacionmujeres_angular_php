import { CommonModule } from '@angular/common';
import { Component, Input } from '@angular/core';

@Component({
    selector: 'app-dashboard-header',
    templateUrl: './dashboard-header.component.html',
    styleUrls: ['./dashboard-header.component.css'],
    imports: [CommonModule]
})
export class DashboardHeaderComponent {
  @Input() icon: string = '';
  @Input() title: string = '';
  @Input() number: number = 0;
  @Input() type: string = '';
}
