import { Component, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { GeneralService } from 'src/app/shared/services/generalService.service';

@Component({
    selector: 'app-footer',
    imports: [RouterLink],
    templateUrl: './footer.component.html',
    styleUrl: './footer.component.css'
})
export class FooterComponent {
  private generalService = inject(GeneralService);

  currentYear = this.generalService.currentYear;
}
