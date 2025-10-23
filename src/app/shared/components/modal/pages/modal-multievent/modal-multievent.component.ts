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

import { DictType } from 'src/app/shared/pipe/dict-translate.pipe';

import {
  buildShareTitle,
  localISODate,
} from 'src/app/shared/utils/share-url.util';

import { ButtonIconComponent } from '../../../buttons/button-icon/button-icon.component';
import { SocialMediaShareComponent } from '../../../social-media/social-media-share.component';
import { TextTitleComponent } from '../../../text/text-title/text-title.component';
import { ConfirmDialogComponent } from '../modal-confirm-dialog/modal-confirm-dialog';

// ✅ Nuevas utilidades para no duplicar lógica

import { CardEventMiniComponent } from 'src/app/modules/landing/components/cards/card-events-min/card-events.min.component';
import {
  isDraft,
  isScheduled,
  parsePublishDate,
} from 'src/app/shared/utils/events.utils';
import { computeMultiShare } from 'src/app/shared/utils/share-multi-date.util';
import { pickShareDate } from 'src/app/shared/utils/share-url.util';

@Component({
  selector: 'app-modal-multievent',
  standalone: true,
  imports: [
    CommonModule,
    ButtonIconComponent,
    SocialMediaShareComponent,
    TextTitleComponent,
    ConfirmDialogComponent,
    CardEventMiniComponent,
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
  @Output() close = new EventEmitter<void>(); // 🔹 cerrar modal al quedar vacía

  readonly typeModal: TypeList = TypeList.Events;
  readonly dictType = DictType;
  readonly appLocale = this.locale;

  isConfirmOpen = false;
  itemToDelete: EventModelFullData | null = null;
  shareTitle = '';
  shareUrl = '';

  // ✅ Hooks
  ngOnChanges(_: SimpleChanges = {}) {
    this.recomputeShare();
  }

  /** ✅ Unifica la construcción de título y URL para compartir */
  private recomputeShare(): void {
    const { date: picked, url } = computeMultiShare(
      this.date,
      this.events,
      this.sharePath
    );
    this.shareTitle = buildShareTitle(
      'Programación de eventos',
      picked,
      this.appLocale
    );
    this.shareUrl = url;
  }

  /** Expuesta al template: devuelve lo ya calculado */
  getShareUrl(): string {
    return this.shareUrl;
  }

  // ✅ Acciones
  onOpenEvent(eventId: number | null | undefined): void {
    if (typeof eventId === 'number') this.openEvent.emit(eventId);
  }

  viewById(id: number): void {
    this.view.emit(id);
  }

  editById(id: number): void {
    this.edit.emit(id);
  }

  onAddClick(): void {
    const d = pickShareDate(this.date, this.events);
    if (d) this.addEvent.emit(localISODate(d));
  }

  // ✅ Estado de publicación (sin duplicar lógica)
  public isDraft(ev: any): boolean {
    return isDraft(ev);
  }

  private parsePublishDate(ev: any): Date | null {
    return parsePublishDate(ev);
  }

  getScheduledDate(ev: any): Date | null {
    return this.parsePublishDate(ev);
  }

  public isScheduled(ev: any): boolean {
    return isScheduled(ev);
  }

  /** 🔹 Confirmar eliminación del evento seleccionado */
  confirmRemove(): void {
    const id = this.itemToDelete?.id;
    if (typeof id === 'number') {
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
        // Recalcular datos de compartir
        this.recomputeShare();
      }
    } else {
      this.closeConfirm();
    }
  }

  cancelRemove(): void {
    this.closeConfirm();
  }

  private closeConfirm(): void {
    this.isConfirmOpen = false;
    this.itemToDelete = null;
  }

  @HostListener('document:keydown.escape', ['$event'])
  handleEscape(_: KeyboardEvent): void {
    if (this.isConfirmOpen) this.closeConfirm();
  }

  handleEventAction(ev: { type: string; event: EventModelFullData }): void {
    switch (ev.type) {
      case 'view':
        this.view.emit(ev.event.id);
        break;
      case 'edit':
        this.edit.emit(ev.event.id);
        break;
      case 'remove':
        this.removeById(ev.event);
        break;
    }
  }

  removeById(event: EventModelFullData): void {
    this.itemToDelete = event;
    this.isConfirmOpen = true;
  }

  trackByEventId = (index: number, e: { id?: number | null }) => e.id ?? index;
}
