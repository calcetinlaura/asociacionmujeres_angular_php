import { TypeActionModal, TypeList } from 'src/app/core/models/general.model';

export interface ModalState<T> {
  typeModal: TypeList;
  action: TypeActionModal;
  item: T | null;
}

export class ModalHistory<T> {
  private stack: ModalState<T>[] = [];
  get size() {
    return this.stack.length;
  }
  get canGoBack() {
    return this.stack.length > 0;
  }
  push(s: ModalState<T>) {
    this.stack.push(s);
  }
  pop(): ModalState<T> | undefined {
    return this.stack.pop();
  }
  clear() {
    this.stack = [];
  }
}
