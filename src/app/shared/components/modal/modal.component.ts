import {
  Component,
  Input,
  Output,
  EventEmitter,
  OnInit,
  Inject,
  inject,
} from '@angular/core';
import { TypeActionModal, TypeList } from 'src/app/core/models/general.model';
import { GeneralService } from '../../services/generalService.service';
import { CommonModule } from '@angular/common';
import { FormEventComponent } from '../../../modules/dashboard/pages/events/components/form/form-event.component';
import { FormRecipeComponent } from '../../../modules/dashboard/pages/recipes/components/form/form-recipe.component';
import { FormBookComponent } from '../../../modules/dashboard/pages/books/components/form/form-book.component';
import { FormMovieComponent } from '../../../modules/dashboard/pages/movies/components/form/form-movie.component';
import { FormPiteraComponent } from '../../../modules/dashboard/pages/piteras/components/form/form-pitera.component';
import { FormInvoiceComponent } from 'src/app/modules/dashboard/pages/invoices/components/form/form-invoice.component';
import { FormCreditorComponent } from 'src/app/modules/dashboard/pages/creditors/components/form/form-creditor.component';
import { BookModel } from 'src/app/core/interfaces/book.interface';
import { EventModel } from 'src/app/core/interfaces/event.interface';
import { MovieModel } from 'src/app/core/interfaces/movie.interface';
import { RecipeModel } from 'src/app/core/interfaces/recipe.interface';
import { PiteraModel } from 'src/app/core/interfaces/pitera.interface';
import { PartnerModel } from 'src/app/core/interfaces/partner.interface';
import { InvoiceModel } from 'src/app/core/interfaces/invoice.interface';
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
    ModalShowComponent,
    ModalDeleteComponent,
  ],
  selector: 'app-modal',
  templateUrl: './modal.component.html',
  styleUrls: ['./modal.component.css'],
})
export class ModalComponent implements OnInit {
  private generalService = inject(GeneralService);

  @Output() closeModal = new EventEmitter<boolean>();
  @Output() confirmDelete = new EventEmitter<number>();
  @Output() sendFormBookData = new EventEmitter<{
    itemId: number;
    newBookData: BookModel;
  }>();

  @Output() sendFormEventData = new EventEmitter<{
    itemId: number;
    newEventData: EventModel;
  }>();
  @Output() sendFormMovieData = new EventEmitter<{
    itemId: number;
    newMovieData: MovieModel;
  }>();
  @Output() sendFormRecipeData = new EventEmitter<{
    itemId: number;
    newRecipeData: RecipeModel;
  }>();
  @Output() sendFormPiteraData = new EventEmitter<{
    itemId: number;
    newPiteraData: PiteraModel;
  }>();
  @Output() sendFormPartnerData = new EventEmitter<{
    itemId: number;
    newPartnerData: PartnerModel;
  }>();
  @Output() sendFormInvoiceData = new EventEmitter<{
    itemId: number;
    newInvoiceData: InvoiceModel;
  }>();
  @Output() sendFormSubsidyData = new EventEmitter<{
    itemId: number;
    newSubsidyData: SubsidyModel;
  }>();
  @Output() sendFormCreditorData = new EventEmitter<{
    itemId: number;
    newCreditorData: CreditorModel;
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

  onSendFormBook(formValue: BookModel) {
    this.sendFormBookData.emit({
      itemId: this.item?.id || 0,
      newBookData: formValue,
    });
  }

  onSendFormEvent(formValue: EventModel) {
    this.sendFormEventData.emit({
      itemId: this.item?.id || 0,
      newEventData: formValue,
    });
  }

  onSendFormRecipe(formValue: RecipeModel) {
    this.sendFormRecipeData.emit({
      itemId: this.item?.id || 0,
      newRecipeData: formValue,
    });
  }

  onSendFormMovie(formValue: MovieModel) {
    this.sendFormMovieData.emit({
      itemId: this.item?.id || 0,
      newMovieData: formValue,
    });
  }

  onSendFormPitera(formValue: PiteraModel) {
    this.sendFormPiteraData.emit({
      itemId: this.item?.id || 0,
      newPiteraData: formValue,
    });
  }

  onSendFormPartner(formValue: PartnerModel) {
    this.sendFormPartnerData.emit({
      itemId: this.item?.id || 0,
      newPartnerData: formValue,
    });
  }

  onSendFormInvoice(formValue: InvoiceModel) {
    this.sendFormInvoiceData.emit({
      itemId: this.item?.id || 0,
      newInvoiceData: formValue,
    });
  }

  onSendFormSubsidy(formValue: SubsidyModel) {
    this.sendFormSubsidyData.emit({
      itemId: this.item?.id || 0,
      newSubsidyData: formValue,
    });
  }
  onSendFormCreditor(formValue: CreditorModel) {
    this.sendFormCreditorData.emit({
      itemId: this.item?.id || 0,
      newCreditorData: formValue,
    });
  }
}
