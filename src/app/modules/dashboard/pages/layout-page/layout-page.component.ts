import { Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { SideBarComponent } from 'src/app/shared/components/sidebar/sidebar.component';

@Component({
  selector: 'app-home-page',
  templateUrl: './layout-page.component.html',
  styleUrl: './layout-page.component.css',
  imports: [SideBarComponent, RouterOutlet],
})
export class LayoutPageComponent {}
