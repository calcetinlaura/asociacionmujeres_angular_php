import { Component, Input } from '@angular/core';
import { TypeList } from 'src/app/core/models/general.model';

import { CommonModule } from '@angular/common';
import { ModalShowAgentComponent } from 'src/app/modules/dashboard/pages/agents/components/modal-show/modal-show-agent.component';
import { ModalShowBookComponent } from 'src/app/modules/dashboard/pages/books/components/modal-show/modal-show-book.component';
import { ModalShowCreditorComponent } from 'src/app/modules/dashboard/pages/creditors/components/modal-show/modal-show-creditor.component';
import { ModalShowEventComponent } from 'src/app/modules/dashboard/pages/events/components/modal-show/modal-show-event.component';
import { ModalShowInvoiceComponent } from 'src/app/modules/dashboard/pages/invoices/components/modal-show/modal-show-invoice.component';
import { ModalShowMacroeventComponent } from 'src/app/modules/dashboard/pages/macroevents/components/modal-show/modal-show-macroevent.component';
import { ModalShowMovieComponent } from 'src/app/modules/dashboard/pages/movies/components/modal-show/modal-show-movie.component';
import { ModalShowPartnerComponent } from 'src/app/modules/dashboard/pages/partners/components/modal-show/modal-show-partner.component';
import { ModalShowPiteraComponent } from 'src/app/modules/dashboard/pages/piteras/components/modal-show/modal-show-pitera.component';
import { ModalShowPlaceComponent } from 'src/app/modules/dashboard/pages/places/components/modal-show/modal-show-place.component';
import { ModalShowRecipeComponent } from 'src/app/modules/dashboard/pages/recipes/components/modal-show/modal-show-recipe.component';
import { ModalShowSubsidyComponent } from 'src/app/modules/dashboard/pages/subsidies/components/modal-show/modal-show-subsidy.component';
import { ImagenModal } from 'src/app/shared/components/modal/components/img-modal/img-modal.components';

@Component({
  standalone: true,
  imports: [
    CommonModule,
    ModalShowMovieComponent,
    ModalShowBookComponent,
    ModalShowMacroeventComponent,
    ModalShowEventComponent,
    ModalShowPiteraComponent,
    ModalShowRecipeComponent,
    ModalShowPartnerComponent,
    ModalShowInvoiceComponent,
    ModalShowAgentComponent,
    ModalShowCreditorComponent,
    ImagenModal,
    ModalShowSubsidyComponent,
    ModalShowPlaceComponent,
  ],
  selector: 'app-modal-show',
  templateUrl: './modal-show.component.html',
  styleUrls: ['./modal-show.component.css'],
})
export class ModalShowComponent {
  @Input() item?: any;
  @Input() type?: TypeList;

  TypeList = TypeList;
}
