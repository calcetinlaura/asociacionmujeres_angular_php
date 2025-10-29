import { CommonModule } from '@angular/common';
import {
  Component,
  DestroyRef,
  EventEmitter,
  Input,
  Output,
  inject,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { finalize, tap } from 'rxjs/operators';
import { EventsFacade } from 'src/app/application/events.facade';
import {
  EnumStatusEvent,
  EventModelFullData,
} from 'src/app/core/interfaces/event.interface';
import { TypeList } from 'src/app/core/models/general.model';
import { ImageZoomOverlayComponent } from 'src/app/shared/components/image-zoom-overlay/image-zoom-overlay.component';
import { MapComponent } from 'src/app/shared/components/map/map.component';
import { SocialMediaShareComponent } from 'src/app/shared/components/social-media/social-media-share.component';
import { TextBackgroundComponent } from 'src/app/shared/components/text/text-background/text-background.component';
import { TextEditorComponent } from 'src/app/shared/components/text/text-editor/text-editor.component';
import { TextSubTitleComponent } from 'src/app/shared/components/text/text-subTitle/text-subtitle.component';
import { TextTitleComponent } from 'src/app/shared/components/text/text-title/text-title.component';
import { AudienceBadgesPipe } from 'src/app/shared/pipe/audience-badges.pipe';
import {
  DictTranslatePipe,
  DictType,
} from 'src/app/shared/pipe/dict-translate.pipe';
import { EnsureArrayPipe } from 'src/app/shared/pipe/ensure-array.pipe';
import { FilterTransformCodePipe } from 'src/app/shared/pipe/filterTransformCode.pipe';
import { ItemImagePipe } from 'src/app/shared/pipe/item-img.pipe';
import { SafeHtmlPipe } from 'src/app/shared/pipe/safe-html.pipe';
import { SocialIconPipe } from 'src/app/shared/pipe/social-icon.pipe';
import { SocialUrlPipe } from 'src/app/shared/pipe/social-url.pipe';
import { YoutubeEmbedPipe } from 'src/app/shared/pipe/youtube-embed.pipe';
import { buildShareUrl } from 'src/app/shared/utils/share-url.util';
import { environments } from 'src/environments/environments';
import { EventPublishPillComponent } from '../publish-pill/publish-pill.component';

@Component({
  selector: 'app-modal-show-event',
  imports: [
    CommonModule,
    TextBackgroundComponent,
    TextTitleComponent,
    TextSubTitleComponent,
    TextEditorComponent,
    MapComponent,
    SocialMediaShareComponent,
    ItemImagePipe,
    FilterTransformCodePipe,
    DictTranslatePipe,
    AudienceBadgesPipe,
    ImageZoomOverlayComponent,
    SafeHtmlPipe,
    EventPublishPillComponent,
    EnsureArrayPipe,
    SocialUrlPipe,
    SocialIconPipe,
    YoutubeEmbedPipe,
  ],
  templateUrl: './modal-show-event.component.html',
  styleUrls: ['./modal-show-event.component.css'],
})
export class ModalShowEventComponent {
  private readonly eventsFacade = inject(EventsFacade);
  private readonly destroyRef = inject(DestroyRef);

  @Input() item!: Partial<EventModelFullData> & { id: number };
  @Input() isDashboard = false;
  @Output() openMacroevent = new EventEmitter<number>();

  loading = false;
  typeModal: TypeList = TypeList.Events;
  enumStatusEnum = EnumStatusEvent;
  dictType = DictType;
  showZoom = false;

  ngOnChanges(): void {
    if (this.item?.id && (!this.item.title || !this.item.start)) {
      this.loading = true;

      this.eventsFacade.loadEventById(this.item.id);

      this.eventsFacade.selectedEvent$
        .pipe(
          takeUntilDestroyed(this.destroyRef),
          tap((ev) => {
            if (ev) this.item = ev;
          }),
          finalize(() => (this.loading = false))
        )
        .subscribe();
    }
  }

  onOpenMacroevent(macroeventId: number) {
    if (macroeventId) this.openMacroevent.emit(macroeventId);
  }
  openZoom() {
    this.showZoom = true;
  }
  closeZoom() {
    this.showZoom = false;
  }

  get shareTitle(): string {
    return this.item?.title ?? 'Evento';
  }

  get shareUrl(): string {
    return this.item?.id
      ? buildShareUrl({
          base: environments.publicBaseUrl,
          path: `/events/${this.item.id}`,
        })
      : '';
  }
}
