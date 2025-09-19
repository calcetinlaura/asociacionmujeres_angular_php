import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Input, Output } from '@angular/core';
import { TypeActionModal, TypeList } from 'src/app/core/models/general.model';

// Formularios
import { FormAgentComponent } from 'src/app/modules/dashboard/pages/agents/components/form/form-agent.component';
import { FormArticleComponent } from 'src/app/modules/dashboard/pages/articles/components/form/form-article.component';
import { FormBookComponent } from 'src/app/modules/dashboard/pages/books/components/form/form-book.component';
import { FormCreditorComponent } from 'src/app/modules/dashboard/pages/creditors/components/form/form-creditor.component';
import { FormEventComponent } from 'src/app/modules/dashboard/pages/events/components/form/form-event.component';
import { FormInvoiceComponent } from 'src/app/modules/dashboard/pages/invoices/components/form/form-invoice.component';
import { FormMacroeventComponent } from 'src/app/modules/dashboard/pages/macroevents/components/form/form-macroevent.component';
import { FormMovieComponent } from 'src/app/modules/dashboard/pages/movies/components/form/form-movie.component';
import { FormPartnerComponent } from 'src/app/modules/dashboard/pages/partners/components/form/form-partner.component';
import { FormPiteraComponent } from 'src/app/modules/dashboard/pages/piteras/components/form/form-pitera.component';
import { FormPlaceComponent } from 'src/app/modules/dashboard/pages/places/components/form/form-place.component';
import { FormPodcastComponent } from 'src/app/modules/dashboard/pages/podcasts/components/form/form-podcast.component';
import { FormProjectComponent } from 'src/app/modules/dashboard/pages/projects/components/form/form-project.component';
import { FormRecipeComponent } from 'src/app/modules/dashboard/pages/recipes/components/form/form-recipe.component';
import { FormSubsidyComponent } from 'src/app/modules/dashboard/pages/subsidies/components/form/form-subsidy.component';

// Shows
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

// Delete genérico
import { ModalDeleteComponent } from './pages/modal-delete/modal-delete.component';

@Component({
  selector: 'app-modal-router',
  standalone: true,
  imports: [
    CommonModule,
    // forms
    FormPartnerComponent,
    FormEventComponent,
    FormRecipeComponent,
    FormBookComponent,
    FormMovieComponent,
    FormPiteraComponent,
    FormInvoiceComponent,
    FormSubsidyComponent,
    FormCreditorComponent,
    FormAgentComponent,
    FormPlaceComponent,
    FormMacroeventComponent,
    FormPodcastComponent,
    FormArticleComponent,
    FormProjectComponent,
    // shows
    ModalShowEventComponent,
    ModalShowBookComponent,
    ModalShowMovieComponent,
    ModalShowRecipeComponent,
    ModalShowMacroeventComponent,
    ModalShowAgentComponent,
    ModalShowArticleComponent,
    ModalShowCreditorComponent,
    ModalShowInvoiceComponent,
    ModalShowPartnerComponent,
    ModalShowPiteraComponent,
    ModalShowPlaceComponent,
    ModalShowPodcastComponent,
    ModalShowProjectComponent,
    ModalShowSubsidyComponent,
    // delete (genérico)
    ModalDeleteComponent,
  ],
  templateUrl: './modal-router.component.html',
})
export class ModalRouterComponent {
  @Input() item?: any;
  @Input() typeModal!: TypeList;
  @Input() typePage?: TypeList;
  @Input() action!: TypeActionModal;

  // eventos hacia fuera
  @Output() closeRequested = new EventEmitter<void>();
  @Output() openMacroevent = new EventEmitter<number>();
  @Output() openEvent = new EventEmitter<number>();
  @Output() confirmDelete = new EventEmitter<{
    type: TypeList;
    id: number;
    item?: any;
  }>();

  // reemite formularios
  @Output() sendFormBookData = new EventEmitter<{
    itemId: number;
    formData: FormData;
  }>();
  @Output() sendFormEventData = new EventEmitter<{
    itemId: number;
    formData: FormData;
  }>();
  @Output() sendFormMacroeventData = new EventEmitter<{
    itemId: number;
    formData: FormData;
  }>();
  @Output() sendFormMovieData = new EventEmitter<{
    itemId: number;
    formData: FormData;
  }>();
  @Output() sendFormRecipeData = new EventEmitter<{
    itemId: number;
    formData: FormData;
  }>();
  @Output() sendFormPiteraData = new EventEmitter<{
    itemId: number;
    formData: FormData;
  }>();
  @Output() sendFormPartnerData = new EventEmitter<{
    itemId: number;
    formData: FormData;
  }>();
  @Output() sendFormInvoiceData = new EventEmitter<{
    itemId: number;
    formData: FormData;
  }>();
  @Output() sendFormSubsidyData = new EventEmitter<{
    itemId: number;
    formData: FormData;
  }>();
  @Output() sendFormCreditorData = new EventEmitter<{
    itemId: number;
    formData: FormData;
  }>();
  @Output() sendFormAgentData = new EventEmitter<{
    itemId: number;
    formData: FormData;
  }>();
  @Output() sendFormPlaceData = new EventEmitter<{
    itemId: number;
    formData: FormData;
  }>();
  @Output() sendFormArticleData = new EventEmitter<{
    itemId: number;
    formData: FormData;
  }>();
  @Output() sendFormProjectData = new EventEmitter<{
    itemId: number;
    formData: FormData;
  }>();
  @Output() sendFormPodcastData = new EventEmitter<{
    itemId: number;
    formData: FormData;
  }>();

  TypeActionModal = TypeActionModal;
  TypeList = TypeList;

  onClose() {
    this.closeRequested.emit();
  }

  onOpenMacroeventFromChild(id: number) {
    if (id) this.openMacroevent.emit(id);
  }
  onOpenEventFromMacro(id: number) {
    if (id) this.openEvent.emit(id);
  }

  // ✅ Único punto para confirmar borrado y cerrar la modal
  onConfirmDelete(idItem: number) {
    if (!idItem) {
      console.warn('[ModalRouter] No hay id para eliminar', this.item);
      return;
    }

    this.confirmDelete.emit({
      type: this.typeModal,
      id: idItem,
      item: this.item,
    });
    this.onClose();
  }
}
