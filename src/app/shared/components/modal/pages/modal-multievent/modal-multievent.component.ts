import { CommonModule } from '@angular/common';
import {
  Component,
  EventEmitter,
  HostListener,
  Input,
  Output,
} from '@angular/core';
import { EventModelFullData } from 'src/app/core/interfaces/event.interface';
import { TypeList } from 'src/app/core/models/general.model';

// UI/auxiliares para render
import { ImgBrokenDirective } from 'src/app/shared/directives/img-broken.directive';
import {
  DictTranslatePipe,
  DictType,
} from 'src/app/shared/pipe/dict-translate.pipe';
import { FilterTransformCodePipe } from 'src/app/shared/pipe/filterTransformCode.pipe';
import { ItemImagePipe } from 'src/app/shared/pipe/item-img.pipe';

import { environments } from 'src/environments/environments';
import { ButtonIconComponent } from '../../../buttons/button-icon/button-icon.component';
import { IconActionComponent } from '../../../buttons/icon-action/icon-action.component';
import { SocialMediaShareComponent } from '../../../social-media/social-media-share.component';
import { TextTitleComponent } from '../../../text/text-title/text-title.component';

@Component({
  selector: 'app-modal-multievent',
  standalone: true,
  imports: [
    CommonModule,
    // render item
    ImgBrokenDirective,
    ItemImagePipe,
    FilterTransformCodePipe,
    DictTranslatePipe,
    // UI auxiliares
    ButtonIconComponent,
    SocialMediaShareComponent,
    TextTitleComponent,
    IconActionComponent,
  ],
  templateUrl: './modal-multievent.component.html',
  styleUrls: ['./modal-multievent.component.css'],
})
export class ModalMultiEventComponent {
  // 🔹 Entradas mínimas
  @Input() events: EventModelFullData[] = [];
  @Input() date: Date | null = null;
  @Input() isDashboard = false;

  // 👉 Ruta base pública de la página de eventos (cámbiala si la tuya es otra)
  @Input() sharePath = '/events';

  // 🔹 Salidas para que el shell/parent gestione acciones
  @Output() openEvent = new EventEmitter<number>();
  @Output() addAtDate = new EventEmitter<string>(); // YYYY-MM-DD
  @Output() view = new EventEmitter<number>();
  @Output() edit = new EventEmitter<number>();
  @Output() remove = new EventEmitter<number>();

  // helpers
  typeModal: TypeList = TypeList.Events;
  dictType = DictType;

  // 🔸 Estado para confirmación
  isConfirmOpen = false;
  idToRemove: number | null = null;

  // 👉 Título para compartir
  get shareTitle(): string {
    const displayDate =
      this.date ??
      (this.events?.length && this.events[0]?.start
        ? new Date(this.events[0].start)
        : null);

    if (!displayDate) return 'Programación de eventos';

    const formatted = displayDate.toLocaleDateString('es-ES', {
      weekday: 'long',
      day: '2-digit',
      month: 'long',
      year: 'numeric',
    });
    return `Programación de eventos - ${formatted}`;
  }

  // 👉 URL para compartir: SIEMPRE a la página de eventos con ?multiDate=YYYY-MM-DD
  getShareUrl(): string {
    const iso = this.isoFromContext();
    if (!iso) return '';

    // Usa SIEMPRE el dominio del environment, no el origin de la ventana
    const origin = environments.publicBaseUrl; // p.ej. https://asociaciondemujerescallosadesegura.com
    const base = origin.endsWith('/') ? origin.slice(0, -1) : origin;
    const path = this.sharePath.startsWith('/')
      ? this.sharePath
      : `/${this.sharePath}`;

    return `${base}${path}?multiDate=${iso}`;
  }

  // 👉 Enlace directo de WhatsApp (si además quieres botón propio)
  getWhatsAppHref(): string {
    const text = `${this.shareTitle} ${this.getShareUrl()}`;
    return `https://wa.me/?text=${encodeURIComponent(text)}`;
  }

  // === privados ===
  private toIso(d: Date | null): string | null {
    return d ? d.toLocaleDateString('sv-SE') : null;
  }

  /** Toma el ISO del día: preferimos @Input date; si no, del primer evento. */
  private isoFromContext(): string | null {
    const byDate = this.toIso(this.date);
    if (byDate) return byDate;

    const fromEvent = this.events?.[0]?.start; // suele venir ya como YYYY-MM-DD
    return fromEvent ?? null;
  }

  // Navegar a Event (el router/shell abre el caso de evento)
  onOpenEvent(eventId: number) {
    if (eventId) this.openEvent.emit(eventId);
  }

  // Acciones dashboard
  onAddClick() {
    const iso = this.toIso(this.date);
    if (iso) this.addAtDate.emit(iso);
  }
  onViewClick(e: MouseEvent, id: number) {
    e.stopPropagation();
    this.view.emit(id);
  }
  onEditClick(e: MouseEvent, id: number) {
    e.stopPropagation();
    this.edit.emit(id);
  }

  // ✅ Confirmación antes de eliminar
  onRemoveClick(e: MouseEvent, id: number) {
    e.stopPropagation();
    this.isConfirmOpen = true;
    this.idToRemove = id;
  }

  confirmRemove() {
    if (this.idToRemove != null) {
      this.remove.emit(this.idToRemove);
    }
    this.closeConfirm();
  }

  cancelRemove() {
    this.closeConfirm();
  }

  private closeConfirm() {
    this.isConfirmOpen = false;
    this.idToRemove = null;
  }

  // Cerrar con ESC
  @HostListener('document:keydown.escape', ['$event'])
  handleEscape(_: KeyboardEvent) {
    if (this.isConfirmOpen) this.closeConfirm();
  }
}
