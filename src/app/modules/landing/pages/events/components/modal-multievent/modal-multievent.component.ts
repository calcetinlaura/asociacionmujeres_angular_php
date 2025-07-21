import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Input, Output } from '@angular/core';
import { EventModelFullData } from 'src/app/core/interfaces/event.interface';
import { TypeList } from 'src/app/core/models/general.model';
import { TextBackgroundComponent } from 'src/app/shared/components/text/text-background/text-background.component';
import { TextBorderComponent } from 'src/app/shared/components/text/text-border/text-border.component';
import { ImgBrokenDirective } from 'src/app/shared/directives/img-broken.directive';
import { ItemImagePipe } from '../../../../../../shared/pipe/item-img.pipe';

@Component({
  selector: 'app-modal-multievent',
  standalone: true,
  imports: [
    CommonModule,
    TextBorderComponent,
    TextBackgroundComponent,
    ImgBrokenDirective,
    ItemImagePipe,
  ],
  templateUrl: './modal-multievent.component.html',
  styleUrls: ['./modal-multievent.component.css'],
})
export class ModalMultiEventComponent {
  @Input() events: EventModelFullData[] = [];
  @Output() select = new EventEmitter<EventModelFullData>();
  @Output() close = new EventEmitter<void>();
  type: TypeList = TypeList.Events;

  onSelect(event: EventModelFullData) {
    this.select.emit(event);
  }

  onClose() {
    this.close.emit();
  }

  onCloseModalFromOutside(event: MouseEvent) {
    const modalBody = document.querySelector('.modal_body');
    if (
      event.target &&
      (event.target as HTMLElement).classList.contains('modal') &&
      !modalBody?.contains(event.target as Node) // Check if the click is outside of the modal body
    ) {
      this.onClose(); // Close the modal
    }
  }
}
