import { CommonModule } from '@angular/common';
import { Component, Input, Type } from '@angular/core';
import { TypeList } from 'src/app/core/models/general.model';

// Componentes individuales
import { ModalShowAgentComponent } from 'src/app/modules/dashboard/pages/agents/components/modal-show/modal-show-agent.component';
import { ModalShowArticleComponent } from 'src/app/modules/dashboard/pages/articles/components/modal-show/modal-show-article.component';
import { ModalShowBookComponent } from 'src/app/modules/dashboard/pages/books/components/modal-show/modal-show-book.component';
import { ModalShowCreditorComponent } from 'src/app/modules/dashboard/pages/creditors/components/modal-show/modal-show-creditor.component';
import { ModalShowEventComponent } from 'src/app/modules/dashboard/pages/events/components/modal-show/modal-show-event.component';
import { ModalShowInvoiceComponent } from 'src/app/modules/dashboard/pages/invoices/components/modal-show/modal-show-invoice.component';
import { ModalShowMacroeventComponent } from 'src/app/modules/dashboard/pages/macroevents/components/modal-show/modal-show-macroevent.component';
import { ModalShowMovieComponent } from 'src/app/modules/dashboard/pages/movies/components/modal-show/modal-show-movie.component';
import { ModalShowPartnerComponent } from 'src/app/modules/dashboard/pages/partners/components/modal-show/modal-show-partner.component';
import { ModalShowPiteraComponent } from 'src/app/modules/dashboard/pages/piteras/components/modal-show/modal-show-pitera.component';
import { ModalShowPlaceComponent } from 'src/app/modules/dashboard/pages/places/components/modal-show/modal-show-place.component';
import { ModalShowPodcastComponent } from 'src/app/modules/dashboard/pages/podcasts/components/modal-show/modal-show-podcast.component';
import { ModalShowProjectComponent } from 'src/app/modules/dashboard/pages/projects/components/modal-show/modal-show-project.component';
import { ModalShowRecipeComponent } from 'src/app/modules/dashboard/pages/recipes/components/modal-show/modal-show-recipe.component';
import { ModalShowSubsidyComponent } from 'src/app/modules/dashboard/pages/subsidies/components/modal-show/modal-show-subsidy.component';
import { ImagenModal } from 'src/app/shared/components/modal/components/img-modal/img-modal.components';

@Component({
  standalone: true,
  selector: 'app-modal-show',
  templateUrl: './modal-show.component.html',
  styleUrls: ['./modal-show.component.css'],
  imports: [CommonModule, ImagenModal],
})
export class ModalShowComponent {
  @Input() item: any;
  @Input() type?: TypeList;

  TypeList = TypeList;

  componentMap: Record<TypeList, Type<any>> = {
    [TypeList.Agents]: ModalShowAgentComponent,
    [TypeList.Articles]: ModalShowArticleComponent,
    [TypeList.Books]: ModalShowBookComponent,
    [TypeList.Creditors]: ModalShowCreditorComponent,
    [TypeList.Events]: ModalShowEventComponent,
    [TypeList.Invoices]: ModalShowInvoiceComponent,
    [TypeList.Macroevents]: ModalShowMacroeventComponent,
    [TypeList.Movies]: ModalShowMovieComponent,
    [TypeList.Partners]: ModalShowPartnerComponent,
    [TypeList.Piteras]: ModalShowPiteraComponent,
    [TypeList.Places]: ModalShowPlaceComponent,
    [TypeList.Podcasts]: ModalShowPodcastComponent,
    [TypeList.Projects]: ModalShowProjectComponent,
    [TypeList.Recipes]: ModalShowRecipeComponent,
    [TypeList.Subsidies]: ModalShowSubsidyComponent,
  };

  getDynamicComponent(): Type<any> | null {
    return this.type ? this.componentMap[this.type] : null;
  }
}
