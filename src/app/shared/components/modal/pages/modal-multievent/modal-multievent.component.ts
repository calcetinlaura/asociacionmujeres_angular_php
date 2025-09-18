import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Input, Output } from '@angular/core';
import { EventModelFullData } from 'src/app/core/interfaces/event.interface';
import { TypeList } from 'src/app/core/models/general.model';

// UI y utilidades que ya usas
import { UiModalComponent } from 'src/app/shared/components/modal/ui-modal.component';
import { TextBackgroundComponent } from 'src/app/shared/components/text/text-background/text-background.component';
import { ImgBrokenDirective } from 'src/app/shared/directives/img-broken.directive';
import { FilterTransformCodePipe } from 'src/app/shared/pipe/filterTransformCode.pipe';
import { ItemImagePipe } from 'src/app/shared/pipe/item-img.pipe';

@Component({
  selector: 'app-modal-multievent',
  standalone: true,
  imports: [
    CommonModule,
    UiModalComponent,
    TextBackgroundComponent,
    ImgBrokenDirective,
    ItemImagePipe,
    FilterTransformCodePipe,
  ],
  templateUrl: './modal-multievent.component.html',
  styleUrls: ['./modal-multievent.component.css'],
})
export class ModalMultiEventComponent {
  /** Control de apertura desde el padre: [(open)] */
  @Input() open = false;
  @Output() openChange = new EventEmitter<boolean>();

  /** Datos */
  @Input() events: EventModelFullData[] = [];

  /** Cerrar la modal al seleccionar un evento */
  @Input() closeOnSelect = true;

  /** Eventos hacia el padre */
  @Output() select = new EventEmitter<EventModelFullData>();
  @Output() close = new EventEmitter<void>();

  /** Para pipes existentes */
  typeModal: TypeList = TypeList.Events;

  onSelect(ev: EventModelFullData) {
    this.select.emit(ev);
    if (this.closeOnSelect) {
      this.openChange.emit(false);
      this.close.emit();
    }
  }

  onClose() {
    this.openChange.emit(false);
    this.close.emit();
  }
}
