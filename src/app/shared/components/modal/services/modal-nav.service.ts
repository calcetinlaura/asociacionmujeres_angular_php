// shared/modal/modal-nav.service.ts
import { computed, Injectable, signal } from '@angular/core';
import { ModalHistory, ModalState } from '../modal-history';

@Injectable({ providedIn: 'root' })
export class ModalNavService<T = any> {
  private history = new ModalHistory<T>();
  private _size = signal(0);
  readonly canGoBack = computed(() => this._size() > 0);

  push(s: ModalState<T>) {
    this.history.push(s);
    this._size.set(this.history.size);
  }
  pop(): ModalState<T> | undefined {
    const v = this.history.pop();
    this._size.set(this.history.size);
    return v;
  }
  clear() {
    this.history.clear();
    this._size.set(0);
  }
}
