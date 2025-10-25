import { Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { FooterComponent } from 'src/app/shared/components/footer/footer.component';
import { NavbarComponent } from 'src/app/shared/components/navbar/navbar.component';

@Component({
  selector: 'app-landing-page',
  imports: [NavbarComponent, RouterOutlet, FooterComponent],
  templateUrl: './landing-page.component.html',
  styleUrls: ['./landing-page.component.css'],
})
export class LandingPageComponent {}
