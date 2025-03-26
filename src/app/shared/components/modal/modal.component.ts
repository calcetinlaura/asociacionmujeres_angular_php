import { Component, Input, Output, EventEmitter, OnInit } from '@angular/core';
import { TypeActionModal, TypeList } from 'src/app/core/models/general.model';
import { CommonModule } from '@angular/common';
import { FormEventComponent } from '../../../modules/dashboard/pages/events/components/form/form-event.component';
import { FormRecipeComponent } from '../../../modules/dashboard/pages/recipes/components/form/form-recipe.component';
import { FormBookComponent } from '../../../modules/dashboard/pages/books/components/form/form-book.component';
import { FormMovieComponent } from '../../../modules/dashboard/pages/movies/components/form/form-movie.component';
import { FormPiteraComponent } from '../../../modules/dashboard/pages/piteras/components/form/form-pitera.component';
import { FormInvoiceComponent } from 'src/app/modules/dashboard/pages/invoices/components/form/form-invoice.component';
import { FormCreditorComponent } from 'src/app/modules/dashboard/pages/creditors/components/form/form-creditor.component';
import { FormPlaceComponent } from 'src/app/modules/dashboard/pages/places/components/form/form-place.component';
import { CreditorModel } from 'src/app/core/interfaces/creditor.interface';
import { ModalShowComponent } from './pages/modal-show/modal-show.component';
import { ModalDeleteComponent } from './pages/modal-delete/modal-delete.component';
import { FormPartnerComponent } from 'src/app/modules/dashboard/pages/partners/components/form/form-partner.component';
import { SubsidyModel } from 'src/app/core/interfaces/subsidy.interface';
import { FormSubsidyComponent } from 'src/app/modules/dashboard/pages/subsidies/components/form/form-subsidy.component';

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
    FormPlaceComponent,
    ModalShowComponent,
    ModalDeleteComponent,
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

  onConfirmDeleteBook(id: number): void {
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
  onSendFormPlace(event: { itemId: number; newPlaceData: FormData }) {
    this.sendFormPlaceData.emit({
      itemId: event.itemId,
      newPlaceData: event.newPlaceData,
    });
  }
}
