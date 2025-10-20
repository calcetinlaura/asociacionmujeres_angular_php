import { CommonModule } from '@angular/common';
import { Component, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { GeneralService } from 'src/app/shared/services/generalService.service';
import { SocialIconPipe } from '../../../../shared/pipe/social-icon.pipe';
import { SocialUrlPipe } from '../../../../shared/pipe/social-url.pipe';

@Component({
  selector: 'app-footer',
  imports: [CommonModule, RouterLink, SocialIconPipe, SocialUrlPipe],
  templateUrl: './footer.component.html',
  styleUrl: './footer.component.css',
})
export class FooterComponent {
  private generalService = inject(GeneralService);

  currentYear = this.generalService.currentYear;
}
