import { Component, Input } from '@angular/core';
import { TypeList } from 'src/app/core/models/general.model';

import { CommonModule } from '@angular/common';
import { ModalShowBookComponent } from 'src/app/modules/dashboard/pages/books/components/modal-show/modal-show-book.component';
import { ModalShowCreditorComponent } from 'src/app/modules/dashboard/pages/creditors/components/modal-show/modal-show-creditor.component';
import { ModalShowEventComponent } from 'src/app/modules/dashboard/pages/events/components/modal-show/modal-show-event.component';
import { ModalShowInvoiceComponent } from 'src/app/modules/dashboard/pages/invoices/components/modal-show/modal-show-invoice.component';
import { ModalShowMovieComponent } from 'src/app/modules/dashboard/pages/movies/components/modal-show/modal-show-movie.component';
import { ModalShowPartnerComponent } from 'src/app/modules/dashboard/pages/partners/components/modal-show/modal-show-partner.component';
import { ModalShowPiteraComponent } from 'src/app/modules/dashboard/pages/piteras/components/modal-show/modal-show-pitera.component';
import { ModalShowRecipeComponent } from 'src/app/modules/dashboard/pages/recipes/components/modal-show/modal-show-recipe.component';
import { ImagenModal } from '../../components/img-modal/img-modal.components';
import { ModalShowSubsidyComponent } from '../../../../../modules/dashboard/pages/subsidies/components/modal-show/modal-show-subsidy.component';
import { ModalShowPlaceComponent } from '../../../../../modules/dashboard/pages/places/components/modal-show/modal-show-place.component';

@Component({
  standalone: true,
  imports: [
    CommonModule,
    ModalShowMovieComponent,
    ModalShowBookComponent,
    ModalShowEventComponent,
    ModalShowPiteraComponent,
    ModalShowRecipeComponent,
    ModalShowPartnerComponent,
    ModalShowInvoiceComponent,
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
