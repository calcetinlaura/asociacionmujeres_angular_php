// modal-show-macroevent.component.ts
import { CommonModule, TitleCasePipe } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  EventEmitter,
  inject,
  Input,
  Output,
} from '@angular/core';
import { EventsFacade } from 'src/app/application/events.facade';
import { MacroeventModelFullData } from 'src/app/core/interfaces/macroevent.interface';
import { TypeList } from 'src/app/core/models/general.model';
import { CardEventMiniComponent } from 'src/app/modules/landing/components/cards/card-events-min/card-events.min.component';
import { ImageZoomOverlayComponent } from 'src/app/shared/components/image-zoom-overlay/image-zoom-overlay.component';
import { SocialMediaShareComponent } from 'src/app/shared/components/social-media/social-media-share.component';
import { TextEditorComponent } from 'src/app/shared/components/text/text-editor/text-editor.component';
import { TextSubTitleComponent } from 'src/app/shared/components/text/text-subTitle/text-subtitle.component';
import { TextTitleComponent } from 'src/app/shared/components/text/text-title/text-title.component';
import { DictType } from 'src/app/shared/pipe/dict-translate.pipe';
import { ItemImagePipe } from 'src/app/shared/pipe/item-img.pipe';
import { buildShareUrl } from 'src/app/shared/utils/share-url.util';
import { environments } from 'src/environments/environments';

@Component({
  selector: 'app-modal-show-macroevent',
  standalone: true,
  imports: [
    CommonModule,
    TextTitleComponent,
    TextEditorComponent,
    TextSubTitleComponent,
    ItemImagePipe,
    SocialMediaShareComponent,
    TitleCasePipe,
    ImageZoomOverlayComponent,
    CardEventMiniComponent,
  ],
  templateUrl: './modal-show-macroevent.component.html',
  styleUrls: ['./modal-show-macroevent.component.css'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ModalShowMacroeventComponent {
  private readonly eventsFacade = inject(EventsFacade);
  /** Ahora aceptamos item parcial y con flag loading */
  @Input() item:
    | (Partial<MacroeventModelFullData> & {
        loading?: boolean;
        events?: Array<any>;
      })
    | null = null;

  @Input() isDashboard = false;
  @Output() openEvent = new EventEmitter<number>();

  readonly typeModal: TypeList = TypeList.Macroevents;
  readonly typeEvent: TypeList = TypeList.Events;
  readonly dictType = DictType;

  showZoom = false;

  openZoom() {
    this.showZoom = true;
  }
  closeZoom() {
    this.showZoom = false;
  }

  onOpenEvent(eventId: number): void {
    if (eventId) this.openEvent.emit(eventId);
  }

  trackById = (_: number, ev: any) => ev?.id ?? _;

  get filteredEvents() {
    if (!this.item?.events) return [];
    if (this.isDashboard) return this.item.events;

    const now = new Date();
    return this.item.events.filter((ev) =>
      this.eventsFacade.isVisiblePublic(ev, now)
    );
  }
  /** Fechas iguales (mismo día) con tolerancia a string/Date */
  get datesEquals(): boolean {
    const s = this.item?.start;
    const e = this.item?.end ?? this.item?.start;
    if (!s || !e) return false;
    const d1 = new Date(s),
      d2 = new Date(e);
    return (
      d1.getFullYear() === d2.getFullYear() &&
      d1.getMonth() === d2.getMonth() &&
      d1.getDate() === d2.getDate()
    );
  }

  get shareTitle(): string {
    return this.item?.title ?? 'Macroevento';
  }

  get shareUrl(): string {
    return this.item?.id
      ? buildShareUrl({
          base: environments.publicBaseUrl,
          path: `/macroevents/${this.item.id}`,
        })
      : '';
  }
}
