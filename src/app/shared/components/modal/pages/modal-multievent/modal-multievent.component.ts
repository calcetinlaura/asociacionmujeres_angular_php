import { CommonModule } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  EventEmitter,
  HostListener,
  inject,
  Input,
  LOCALE_ID,
  OnChanges,
  Output,
  SimpleChanges,
} from '@angular/core';
import { EventModelFullData } from 'src/app/core/interfaces/event.interface';
import { TypeList } from 'src/app/core/models/general.model';

import { ImgBrokenDirective } from 'src/app/shared/directives/img-broken.directive';
import {
  DictTranslatePipe,
  DictType,
} from 'src/app/shared/pipe/dict-translate.pipe';
import { FilterTransformCodePipe } from 'src/app/shared/pipe/filterTransformCode.pipe';
import { ItemImagePipe } from 'src/app/shared/pipe/item-img.pipe';

import {
  buildShareTitle,
  buildShareUrl,
  localISODate,
  pickShareDate,
} from 'src/app/shared/utils/share-url.util';
import { environments } from 'src/environments/environments';

import {
  ActionBarComponent,
  ActionItem,
  ActionPayload,
} from '../../../action-bar/action-bar.component';
import { ButtonIconComponent } from '../../../buttons/button-icon/button-icon.component';
import { SocialMediaShareComponent } from '../../../social-media/social-media-share.component';
import { TextTitleComponent } from '../../../text/text-title/text-title.component';
import { ConfirmDialogComponent } from '../modal-confirm-dialog/modal-confirm-dialog';

@Component({
  selector: 'app-modal-multievent',
  standalone: true,
  imports: [
    CommonModule,
    ImgBrokenDirective,
    ItemImagePipe,
    FilterTransformCodePipe,
    DictTranslatePipe,
    ButtonIconComponent,
    SocialMediaShareComponent,
    TextTitleComponent,
    ConfirmDialogComponent,
    ActionBarComponent,
  ],
  templateUrl: './modal-multievent.component.html',
  styleUrls: ['./modal-multievent.component.css'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ModalMultiEventComponent implements OnChanges {
  private readonly locale = inject(LOCALE_ID);

  @Input() events: EventModelFullData[] = [];
  @Input() date: Date | null = null;
  @Input() isDashboard = false;

  @Input({ transform: (v: string) => (v?.startsWith('/') ? v : '/' + v) })
  sharePath = '/events';

  @Output() openEvent = new EventEmitter<number>();
  @Output() addEvent = new EventEmitter<string>(); // YYYY-MM-DD
  @Output() view = new EventEmitter<number>();
  @Output() edit = new EventEmitter<number>();
  @Output() remove = new EventEmitter<number>();
  @Output() close = new EventEmitter<void>(); // 🔹 para cerrar modal al quedar vacía

  readonly typeModal: TypeList = TypeList.Events;
  readonly dictType = DictType;
  readonly appLocale = this.locale;

  isConfirmOpen = false;
  itemToDelete: EventModelFullData | null = null;
  shareTitle = '';
  shareUrl = '';

  ngOnChanges(_: SimpleChanges = {}) {
    const d = pickShareDate(this.date, this.events);
    this.shareTitle = buildShareTitle(
      'Programación de eventos',
      d,
      this.appLocale
    );
    this.shareUrl = d
      ? buildShareUrl({
          base: environments.publicBaseUrl,
          path: this.sharePath,
          params: { multiDate: localISODate(d) },
        })
      : '';
  }

  getShareUrl(): string {
    const d = pickShareDate(this.date, this.events);
    return d
      ? buildShareUrl({
          base: environments.publicBaseUrl,
          path: this.sharePath || '/events',
          params: { multiDate: localISODate(d) },
        })
      : '';
  }

  onOpenEvent(eventId: number) {
    if (eventId) this.openEvent.emit(eventId);
  }

  viewById(id: number) {
    this.openEvent.emit(id);
  }

  editById(id: number) {
    this.edit.emit(id);
  }

  onAddClick(): void {
    const d = pickShareDate(this.date, this.events);
    if (d) this.addEvent.emit(localISODate(d));
  }

  /** 🔹 Confirmar eliminación del evento seleccionado */
  confirmRemove() {
    if (this.itemToDelete?.id != null) {
      const id = this.itemToDelete.id;

      // Emitimos al padre para eliminar en backend
      this.remove.emit(id);

      // Eliminamos localmente para actualizar vista
      this.events = this.events.filter((ev) => ev.id !== id);

      // Cerramos el diálogo de confirmación
      this.closeConfirm();

      // Si ya no quedan eventos, cerramos la modal completa
      if (this.events.length === 0) {
        this.close.emit();
      } else {
        // Forzamos recalcular los datos de compartir
        this.ngOnChanges();
      }
    } else {
      this.closeConfirm();
    }
  }

  cancelRemove() {
    this.closeConfirm();
  }

  private closeConfirm() {
    this.isConfirmOpen = false;
    this.itemToDelete = null;
  }

  @HostListener('document:keydown.escape', ['$event'])
  handleEscape(_: KeyboardEvent) {
    if (this.isConfirmOpen) this.closeConfirm();
  }

  readonly actionsForSection: ActionItem[] = [
    { icon: 'uil-eye', tooltip: 'Ver', type: 'view' },
    { icon: 'uil-edit', tooltip: 'Editar', type: 'edit' },
    { icon: 'uil-trash-alt', tooltip: 'Eliminar', type: 'remove' },
  ];

  handleAction(ev: ActionPayload, element: EventModelFullData) {
    switch (ev.type) {
      case 'view':
        this.view.emit(ev.id);
        break;
      case 'edit':
        this.edit.emit(ev.id);
        break;
      case 'remove':
        this.removeById(element);
        break;
    }
  }

  removeById(event: EventModelFullData) {
    this.itemToDelete = event;
    this.isConfirmOpen = true;
  }

  trackByEventId = (_: number, e: { id?: number | null }) => e.id ?? _;
}
