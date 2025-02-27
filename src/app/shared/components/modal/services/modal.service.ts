import { EventEmitter, Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';

@Injectable({
  providedIn: 'root',
})
export class ModalService {
  constructor() {}
  $modal = new EventEmitter<any>();
  private modalVisibilitySubject = new BehaviorSubject<boolean>(false);
  modalVisibility$ = this.modalVisibilitySubject.asObservable();

  openModal(): void {
    this.modalVisibilitySubject.next(true);
  }

  closeModal(): void {
    this.modalVisibilitySubject.next(false);
  }
}
