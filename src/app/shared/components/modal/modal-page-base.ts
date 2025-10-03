// shared/modal/modal-page-base.ts
import { TypeActionModal, TypeList } from 'src/app/core/models/general.model';
import { ModalHistory } from './modal-history';

export abstract class ModalPageBase<T> {
  isModalVisible = false;
  typeModal: TypeList = TypeList.Events; // valor por defecto
  action: TypeActionModal = TypeActionModal.Show;
  item: T | null = null;
  history = new ModalHistory<T>();

  protected openModal(
    type: TypeList,
    action: TypeActionModal,
    item: T | null,
    openFn: () => void, // normalmente modalService.openModal
    clearOnCreate?: () => void // opcional: limpiar facade en CREATE
  ) {
    this.typeModal = type;
    this.action = action;
    this.item = item;
    if (action === TypeActionModal.Create && clearOnCreate) clearOnCreate();
    openFn();
  }

  pushState() {
    this.history.push({
      typeModal: this.typeModal,
      action: this.action,
      item: this.item,
    });
  }

  back() {
    const prev = this.history.pop();
    if (!prev) return;
    this.typeModal = prev.typeModal;
    this.action = prev.action;
    this.item = prev.item;
  }

  close(closeFn: () => void) {
    closeFn();
    this.item = null;
    this.history.clear();
  }
}
