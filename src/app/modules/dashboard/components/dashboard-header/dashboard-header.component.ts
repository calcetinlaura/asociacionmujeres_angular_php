import { CommonModule } from '@angular/common';
import { Component, HostListener, Input, OnInit } from '@angular/core';

@Component({
  selector: 'app-dashboard-header',
  standalone: true,
  templateUrl: './dashboard-header.component.html',
  styleUrls: ['./dashboard-header.component.css'],
  imports: [CommonModule],
})
export class DashboardHeaderComponent {
  @Input() icon: string = '';
  @Input() title: string = '';
  @Input() number: number = 0;
  @Input() type: string = '';
  isSticky: boolean = false;

  @HostListener('window:scroll', [])
  onWindowScroll() {
    const scrollPosition =
      window.scrollY ||
      document.documentElement.scrollTop ||
      document.body.scrollTop ||
      0;

    // Detectamos si el scroll es mayor a una cantidad (e.g. 200px)
    if (scrollPosition > 50) {
      this.isSticky = true;
    } else {
      this.isSticky = false;
    }
  }
}
