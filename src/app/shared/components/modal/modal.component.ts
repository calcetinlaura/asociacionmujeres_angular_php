import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Input, Output } from '@angular/core';
import { TypeActionModal, TypeList } from 'src/app/core/models/general.model';
import { ModalRouterComponent } from './modal-router.component';
import { UiModalComponent } from './ui-modal.component';

@Component({
  standalone: true,
  imports: [CommonModule, ModalRouterComponent, UiModalComponent],
  selector: 'app-modal',
  templateUrl: './modal.component.html',
})
export class ModalComponent {
  @Input() item: any;
  @Input() typeModal!: TypeList;
  @Input() typePage?: TypeList;
  @Input() action: TypeActionModal = TypeActionModal.Show;

  // 🔹 Control interno de apertura (el componente se crea con *ngIf)
  isOpen = true;

  // 🔹 Outputs que reemites hacia el padre (igual que antes)
  @Output() closeModal = new EventEmitter<boolean>();
  @Output() openMacroevent = new EventEmitter<number>();
  @Output() openEvent = new EventEmitter<number>();
  @Output() confirmDelete = new EventEmitter<{
    type: TypeList;
    id: number;
    item?: any;
  }>();

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

  onCloseModal() {
    this.isOpen = false;
    this.closeModal.emit(true);
  }
  onConfirmDelete(payload: { type: TypeList; id: number; item?: any }) {
    // Reemite hacia el padre y cierra
    this.confirmDelete.emit(payload);
    this.onCloseModal();
  }
  onConfirmDeleteFromChild(type: TypeList, event?: any) {
    const id = this.item?.id ?? event?.id ?? this.item?.ID; // por si algún modelo usa otra clave

    if (!id) {
      console.error('[ModalRouter] No hay id para eliminar', {
        item: this.item,
        event,
      });
      return;
    }

    this.confirmDelete.emit({ type, id, item: this.item });
    this.onCloseModal();
  }
}
