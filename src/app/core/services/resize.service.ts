import { Injectable, HostListener } from '@angular/core';
import { Subject } from 'rxjs';

@Injectable({
  providedIn: 'root',
})
export class ResizeService {
  private resizeSubject = new Subject<Event>();

  get onResize$() {
    return this.resizeSubject.asObservable();
  }

  @HostListener('window:resize', ['$event'])
  onResize(event: Event) {
    this.resizeSubject.next(event);
  }
}
