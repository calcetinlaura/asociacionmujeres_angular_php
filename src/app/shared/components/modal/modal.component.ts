// modal.component.ts
import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Input, OnInit, Output } from '@angular/core';
import { CreditorModel } from 'src/app/core/interfaces/creditor.interface';
import { SubsidyModel } from 'src/app/core/interfaces/subsidy.interface';
import { TypeActionModal, TypeList } from 'src/app/core/models/general.model';
import { FormAgentComponent } from 'src/app/modules/dashboard/pages/agents/components/form/form-agent.component';
import { ModalShowAgentComponent } from 'src/app/modules/dashboard/pages/agents/components/modal-show/modal-show-agent.component';
import { ModalShowArticleComponent } from 'src/app/modules/dashboard/pages/articles/components/modal-show/modal-show-article.component';
import { FormBookComponent } from 'src/app/modules/dashboard/pages/books/components/form/form-book.component';
import { ModalShowBookComponent } from 'src/app/modules/dashboard/pages/books/components/modal-show/modal-show-book.component';
import { FormCreditorComponent } from 'src/app/modules/dashboard/pages/creditors/components/form/form-creditor.component';
import { ModalShowCreditorComponent } from 'src/app/modules/dashboard/pages/creditors/components/modal-show/modal-show-creditor.component';
import { FormEventComponent } from 'src/app/modules/dashboard/pages/events/components/form/form-event.component';
import { ModalShowEventComponent } from 'src/app/modules/dashboard/pages/events/components/modal-show/modal-show-event.component';
import { FormInvoiceComponent } from 'src/app/modules/dashboard/pages/invoices/components/form/form-invoice.component';
import { ModalShowInvoiceComponent } from 'src/app/modules/dashboard/pages/invoices/components/modal-show/modal-show-invoice.component';
import { ModalShowMacroeventComponent } from 'src/app/modules/dashboard/pages/macroevents/components/modal-show/modal-show-macroevent.component';
import { FormMovieComponent } from 'src/app/modules/dashboard/pages/movies/components/form/form-movie.component';
import { ModalShowMovieComponent } from 'src/app/modules/dashboard/pages/movies/components/modal-show/modal-show-movie.component';
import { FormPartnerComponent } from 'src/app/modules/dashboard/pages/partners/components/form/form-partner.component';
import { ModalShowPartnerComponent } from 'src/app/modules/dashboard/pages/partners/components/modal-show/modal-show-partner.component';
import { FormPiteraComponent } from 'src/app/modules/dashboard/pages/piteras/components/form/form-pitera.component';
import { ModalShowPiteraComponent } from 'src/app/modules/dashboard/pages/piteras/components/modal-show/modal-show-pitera.component';
import { FormPlaceComponent } from 'src/app/modules/dashboard/pages/places/components/form/form-place.component';
import { ModalShowPlaceComponent } from 'src/app/modules/dashboard/pages/places/components/modal-show/modal-show-place.component';
import { ModalShowPodcastComponent } from 'src/app/modules/dashboard/pages/podcasts/components/modal-show/modal-show-podcast.component';
import { ModalShowProjectComponent } from 'src/app/modules/dashboard/pages/projects/components/modal-show/modal-show-project.component';
import { FormRecipeComponent } from 'src/app/modules/dashboard/pages/recipes/components/form/form-recipe.component';
import { ModalShowRecipeComponent } from 'src/app/modules/dashboard/pages/recipes/components/modal-show/modal-show-recipe.component';
import { FormSubsidyComponent } from 'src/app/modules/dashboard/pages/subsidies/components/form/form-subsidy.component';
import { ModalShowSubsidyComponent } from 'src/app/modules/dashboard/pages/subsidies/components/modal-show/modal-show-subsidy.component';
import { FormArticleComponent } from '../../../modules/dashboard/pages/articles/components/form/form-article.component';
import { FormMacroeventComponent } from '../../../modules/dashboard/pages/macroevents/components/form/form-macroevent.component';
import { FormPodcastComponent } from '../../../modules/dashboard/pages/podcasts/components/form/form-podcast.component';
import { FormProjectComponent } from '../../../modules/dashboard/pages/projects/components/form/form-project.component';
import { ModalShowWrapperComponent } from './components/modal-show-wrappeer/modal-show-wrapper.component';
import { ModalDeleteComponent } from './pages/modal-delete/modal-delete.component';

@Component({
  standalone: true,
  imports: [
    CommonModule,
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
    ModalDeleteComponent,
    FormMacroeventComponent,
    FormPodcastComponent,
    FormArticleComponent,
    FormProjectComponent,
    FormPodcastComponent,
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
    ModalShowWrapperComponent,
  ],
  selector: 'app-modal',
  templateUrl: './modal.component.html',
  styleUrls: ['./modal.component.css'],
})
export class ModalComponent implements OnInit {
  @Output() openMacroevent = new EventEmitter<number>();
  @Output() openEvent = new EventEmitter<number>();
  @Output() closeModal = new EventEmitter<boolean>();
  @Output() confirmDelete = new EventEmitter<number>();
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
    newSubsidyData: SubsidyModel;
  }>();
  @Output() sendFormCreditorData = new EventEmitter<{
    itemId: number;
    newCreditorData: CreditorModel;
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

  @Input() item?: any;
  @Input() typeModal: TypeList = TypeList.Books;
  @Input() action: TypeActionModal = TypeActionModal.Show;

  TypeActionModal = TypeActionModal;
  TypeList = TypeList;

  constructor() {}

  ngOnInit(): void {}

  onCloseModal() {
    this.closeModal.emit(true);
  }

  // Detectar clics fuera del modal para cerrarlo
  onCloseModalFromOutside(event: MouseEvent) {
    const modalBody = document.querySelector('.modal_body');
    if (
      event.target &&
      (event.target as HTMLElement).classList.contains('modal') &&
      !modalBody?.contains(event.target as Node) // Check if the click is outside of the modal body
    ) {
      this.onCloseModal(); // Close the modal
    }
  }

  onConfirmDelete(id: number): void {
    if (id) {
      this.confirmDelete.emit(id);
    }
  }

  onSendFormBook(event: { itemId: number; formData: FormData }) {
    this.sendFormBookData.emit({
      itemId: event.itemId,
      formData: event.formData,
    });
  }

  onSendFormEvent(event: { itemId: number; formData: FormData }) {
    this.sendFormEventData.emit({
      itemId: event.itemId,
      formData: event.formData,
    });
  }
  onSendFormMacroevent(event: { itemId: number; formData: FormData }) {
    this.sendFormMacroeventData.emit({
      itemId: event.itemId,
      formData: event.formData,
    });
  }

  onSendFormRecipe(event: { itemId: number; formData: FormData }) {
    this.sendFormRecipeData.emit({
      itemId: event.itemId,
      formData: event.formData,
    });
  }

  onSendFormMovie(event: { itemId: number; formData: FormData }) {
    this.sendFormMovieData.emit({
      itemId: event.itemId,
      formData: event.formData,
    });
  }

  onSendFormPitera(event: { itemId: number; formData: FormData }) {
    this.sendFormPiteraData.emit({
      itemId: event.itemId,
      formData: event.formData,
    });
  }

  onSendFormPartner(event: { itemId: number; formData: FormData }) {
    this.sendFormPartnerData.emit({
      itemId: event.itemId,
      formData: event.formData,
    });
  }

  onSendFormInvoice(event: { itemId: number; formData: FormData }) {
    this.sendFormInvoiceData.emit({
      itemId: event.itemId,
      formData: event.formData,
    });
  }

  onSendFormSubsidy(formValue: SubsidyModel) {
    this.sendFormSubsidyData.emit({
      itemId: this.item?.id || 0,
      newSubsidyData: formValue,
    });
  }
  onSendFormCreditor(event: {
    itemId: number;
    newCreditorData: CreditorModel;
  }) {
    this.sendFormCreditorData.emit({
      itemId: event.itemId,
      newCreditorData: event.newCreditorData,
    });
  }

  onSendFormAgent(event: { itemId: number; formData: FormData }) {
    this.sendFormAgentData.emit({
      itemId: event.itemId,
      formData: event.formData,
    });
  }

  onSendFormPlace(event: { itemId: number; formData: FormData }) {
    this.sendFormPlaceData.emit({
      itemId: event.itemId,
      formData: event.formData,
    });
  }

  onSendFormProject(event: { itemId: number; formData: FormData }) {
    this.sendFormProjectData.emit({
      itemId: event.itemId,
      formData: event.formData,
    });
  }
  onSendFormPodcast(event: { itemId: number; formData: FormData }) {
    this.sendFormPodcastData.emit({
      itemId: event.itemId,
      formData: event.formData,
    });
  }
  onSendFormArticle(event: { itemId: number; formData: FormData }) {
    this.sendFormArticleData.emit({
      itemId: event.itemId,
      formData: event.formData,
    });
  }
  onOpenMacroeventFromShow(macroeventId: number): void {
    console.log('ID MACRO en MODAL COMPONENTE', macroeventId);
    this.openMacroevent.emit(macroeventId);
  }
  onOpenEventFromShow(eventId: number): void {
    console.log('ID MACRO en MODAL COMPONENTE', eventId);
    this.openEvent.emit(eventId);
  }
}
