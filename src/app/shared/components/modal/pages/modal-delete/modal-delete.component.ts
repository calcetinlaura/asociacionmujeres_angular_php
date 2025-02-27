import { Component, Input, Output, EventEmitter, OnInit } from '@angular/core';
import { TypeActionModal, TypeList } from 'src/app/core/models/general.model';
import { CommonModule } from '@angular/common';
@Component({
  standalone: true,
  imports: [CommonModule],
  selector: 'app-modal-delete',
  templateUrl: './modal-delete.component.html',
  styleUrls: ['./modal-delete.component.css'],
})
export class ModalDeleteComponent implements OnInit {
  @Output() closeModal = new EventEmitter<boolean>();
  @Output() confirmDelete = new EventEmitter<number>();
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
    if (
      event.target &&
      (event.target as HTMLElement).classList.contains('modal')
    ) {
      this.onCloseModal();
    }
  }

  confirmDeleteItem(): void {
    if (this.item !== undefined) {
      this.confirmDelete.emit(this.item.id);
    }
  }
}
