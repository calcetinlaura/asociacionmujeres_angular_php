import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Input, OnInit, Output } from '@angular/core';
import { CreditorModel } from 'src/app/core/interfaces/creditor.interface';
import { SubsidyModel } from 'src/app/core/interfaces/subsidy.interface';
import { TypeActionModal, TypeList } from 'src/app/core/models/general.model';
import { FormAgentComponent } from 'src/app/modules/dashboard/pages/agents/components/form/form-agent.component';
import { FormBookComponent } from 'src/app/modules/dashboard/pages/books/components/form/form-book.component';
import { FormCreditorComponent } from 'src/app/modules/dashboard/pages/creditors/components/form/form-creditor.component';
import { FormEventComponent } from 'src/app/modules/dashboard/pages/events/components/form/form-event.component';
import { FormInvoiceComponent } from 'src/app/modules/dashboard/pages/invoices/components/form/form-invoice.component';
import { FormMovieComponent } from 'src/app/modules/dashboard/pages/movies/components/form/form-movie.component';
import { FormPartnerComponent } from 'src/app/modules/dashboard/pages/partners/components/form/form-partner.component';
import { FormPiteraComponent } from 'src/app/modules/dashboard/pages/piteras/components/form/form-pitera.component';
import { FormPlaceComponent } from 'src/app/modules/dashboard/pages/places/components/form/form-place.component';
import { FormRecipeComponent } from 'src/app/modules/dashboard/pages/recipes/components/form/form-recipe.component';
import { FormSubsidyComponent } from 'src/app/modules/dashboard/pages/subsidies/components/form/form-subsidy.component';
import { FormMacroeventComponent } from '../../../modules/dashboard/pages/macroevents/components/form/form-macroevent.component';
import { ModalDeleteComponent } from './pages/modal-delete/modal-delete.component';
import { ModalShowComponent } from './pages/modal-show/modal-show.component';

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
    ModalShowComponent,
    ModalDeleteComponent,
    FormMacroeventComponent,
  ],
  selector: 'app-modal',
  templateUrl: './modal.component.html',
  styleUrls: ['./modal.component.css'],
})
export class ModalComponent implements OnInit {
  @Output() closeModal = new EventEmitter<boolean>();
  @Output() confirmDelete = new EventEmitter<number>();
  @Output() sendFormBookData = new EventEmitter<{
    itemId: number;
    newBookData: FormData;
  }>();

  @Output() sendFormEventData = new EventEmitter<{
    itemId: number;
    newEventData: FormData;
  }>();
  @Output() sendFormMacroeventData = new EventEmitter<{
    itemId: number;
    newMacroeventData: FormData;
  }>();
  @Output() sendFormMovieData = new EventEmitter<{
    itemId: number;
    newMovieData: FormData;
  }>();
  @Output() sendFormRecipeData = new EventEmitter<{
    itemId: number;
    newRecipeData: FormData;
  }>();
  @Output() sendFormPiteraData = new EventEmitter<{
    itemId: number;
    newPiteraData: FormData;
  }>();
  @Output() sendFormPartnerData = new EventEmitter<{
    itemId: number;
    newPartnerData: FormData;
  }>();
  @Output() sendFormInvoiceData = new EventEmitter<{
    itemId: number;
    newInvoiceData: FormData;
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
    newAgentData: FormData;
  }>();
  @Output() sendFormPlaceData = new EventEmitter<{
    itemId: number;
    newPlaceData: FormData;
  }>();

  @Input() item?: any;
  @Input() type: TypeList = TypeList.Books;
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

  onSendFormBook(event: { itemId: number; newBookData: FormData }) {
    this.sendFormBookData.emit({
      itemId: event.itemId,
      newBookData: event.newBookData,
    });
  }

  onSendFormEvent(event: { itemId: number; newEventData: FormData }) {
    this.sendFormEventData.emit({
      itemId: event.itemId,
      newEventData: event.newEventData,
    });
  }
  onSendFormMacroevent(event: { itemId: number; newMacroeventData: FormData }) {
    this.sendFormMacroeventData.emit({
      itemId: event.itemId,
      newMacroeventData: event.newMacroeventData,
    });
  }

  onSendFormRecipe(event: { itemId: number; newRecipeData: FormData }) {
    this.sendFormRecipeData.emit({
      itemId: event.itemId,
      newRecipeData: event.newRecipeData,
    });
  }

  onSendFormMovie(event: { itemId: number; newMovieData: FormData }) {
    this.sendFormMovieData.emit({
      itemId: event.itemId,
      newMovieData: event.newMovieData,
    });
  }

  onSendFormPitera(event: { itemId: number; newPiteraData: FormData }) {
    this.sendFormPiteraData.emit({
      itemId: event.itemId,
      newPiteraData: event.newPiteraData,
    });
  }

  onSendFormPartner(event: { itemId: number; newPartnerData: FormData }) {
    this.sendFormPartnerData.emit({
      itemId: event.itemId,
      newPartnerData: event.newPartnerData,
    });
  }

  onSendFormInvoice(event: { itemId: number; newInvoiceData: FormData }) {
    this.sendFormInvoiceData.emit({
      itemId: event.itemId,
      newInvoiceData: event.newInvoiceData,
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

  onSendFormAgent(event: { itemId: number; newAgentData: FormData }) {
    this.sendFormAgentData.emit({
      itemId: event.itemId,
      newAgentData: event.newAgentData,
    });
  }

  onSendFormPlace(event: { itemId: number; newPlaceData: FormData }) {
    this.sendFormPlaceData.emit({
      itemId: event.itemId,
      newPlaceData: event.newPlaceData,
    });
  }
}
