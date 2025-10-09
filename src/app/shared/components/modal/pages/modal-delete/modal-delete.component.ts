import { Component, EventEmitter, Input, OnInit, Output } from '@angular/core';
import { TypeActionModal, TypeList } from 'src/app/core/models/general.model';
type DeleteMessageFormatter = (item: any) => { label: string; value: string };

@Component({
  imports: [],
  selector: 'app-modal-delete',
  templateUrl: './modal-delete.component.html',
  styleUrls: ['./modal-delete.component.css'],
})
export class ModalDeleteComponent implements OnInit {
  @Output() closeModal = new EventEmitter<boolean>();
  @Output() confirmDelete = new EventEmitter<number>();
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

  messageMap: Record<TypeList, DeleteMessageFormatter> = {
    [TypeList.Agents]: (item) => ({
      label: 'al organismo',
      value: item?.company,
    }),
    [TypeList.Articles]: (item) => ({
      label: 'el artículo',
      value: item?.title,
    }),
    [TypeList.Books]: (item) => ({
      label: 'el libro',
      value: item?.title,
    }),
    [TypeList.Creditors]: (item) => ({
      label: 'al acreedor/a',
      value: item?.company,
    }),
    [TypeList.Events]: (item) => ({
      label: 'el evento',
      value: item?.title,
    }),
    [TypeList.Invoices]: (item) => ({
      label: 'la factura ',
      value: item?.number_invoice,
    }),
    [TypeList.Macroevents]: (item) => ({
      label: 'el macroevento',
      value: item?.title,
    }),
    [TypeList.Movies]: (item) => ({
      label: 'la película',
      value: item?.title,
    }),
    [TypeList.Partners]: (item) => ({
      label: 'la socia',
      value: item?.name,
    }),
    [TypeList.Piteras]: () => ({
      label: '',
      value: 'esta Pitera',
    }),
    [TypeList.Places]: (item) => ({
      label: 'el espacio',
      value: item?.name,
    }),
    [TypeList.Podcasts]: (item) => ({
      label: 'el podcast',
      value: item?.title,
    }),
    [TypeList.Projects]: (item) => ({
      label: 'el proyecto',
      value: item?.title,
    }),
    [TypeList.Recipes]: (item) => ({
      label: 'la receta',
      value: item?.title,
    }),
    [TypeList.Subsidies]: (item) => ({
      label: 'la subvención',
      value: `${item?.name} ${item?.year}`,
    }),
    [TypeList.MultiEvents]: (item) => ({
      label: 'los multieventos',
      value: `${item?.name} ${item?.year}`,
    }),
  };

  getDeleteLabel(): string {
    const formatter = this.messageMap[this.typeModal];
    return formatter ? formatter(this.item).label : '';
  }

  getDeleteValue(): string {
    const formatter = this.messageMap[this.typeModal];
    return formatter ? formatter(this.item).value : '';
  }
}
