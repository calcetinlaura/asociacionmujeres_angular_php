import { CommonModule } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  EventEmitter,
  HostListener,
  inject,
  Input,
  LOCALE_ID,
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
    // render item
    ImgBrokenDirective,
    ItemImagePipe,
    FilterTransformCodePipe,
    DictTranslatePipe,
    // UI auxiliares
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
export class ModalMultiEventComponent {
  private readonly locale = inject(LOCALE_ID);

  @Input() events: EventModelFullData[] = [];
  @Input() date: Date | null = null;
  @Input() isDashboard = false;
  //Evita errores si te pasan events sin /:
  @Input({ transform: (v: string) => (v?.startsWith('/') ? v : '/' + v) })
  sharePath = '/events';

  @Output() openEvent = new EventEmitter<number>();
  @Output() addEvent = new EventEmitter<string>(); // YYYY-MM-DD
  @Output() view = new EventEmitter<number>();
  @Output() edit = new EventEmitter<number>();
  @Output() remove = new EventEmitter<number>();

  readonly typeModal: TypeList = TypeList.Events;
  readonly dictType = DictType;

  // 🔸 Estado para confirmación
  isConfirmOpen = false;
  idToRemove: number | null = null;
  shareTitle = '';
  shareUrl = '';
  readonly appLocale = this.locale;

  trackByEventId = (_: number, e: { id?: number | null }) => e.id ?? _;
  ngOnChanges() {
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

  // URL para compartir: SIEMPRE a la página de eventos con ?multiDate=YYYY-MM-DD
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

  // Navegar a Event (el router/shell abre el caso de evento)
  onOpenEvent(eventId: number) {
    if (eventId) this.openEvent.emit(eventId);
  }
  viewById(id: number) {
    this.view.emit(id);
  }
  editById(id: number) {
    this.edit.emit(id);
  }
  removeById(id: number) {
    this.isConfirmOpen = true;
    this.idToRemove = id;
  }
  onAddClick(): void {
    const d = pickShareDate(this.date, this.events);
    if (d) this.addEvent.emit(localISODate(d));
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

  readonly actionsForSection: ActionItem[] = [
    { icon: 'uil-eye', tooltip: 'Ver', type: 'view' },
    { icon: 'uil-edit', tooltip: 'Editar', type: 'edit' },
    { icon: 'uil-trash-alt', tooltip: 'Eliminar', type: 'remove' },
  ];

  handleAction(ev: ActionPayload, element: any) {
    switch (ev.type) {
      case 'view':
        this.view.emit(ev.id);
        break;
      case 'edit':
        this.edit.emit(ev.id);
        break;
      case 'remove':
        this.removeById(ev.id);
        break; // abre confirmación
      // si quisieras soportar más:
      case 'duplicate':
        /* ... */ break;
      case 'download-image':
        /* ... */ break;
    }
  }
}
