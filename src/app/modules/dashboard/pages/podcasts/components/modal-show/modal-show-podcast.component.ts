import { DatePipe } from '@angular/common';
import { Component, Input } from '@angular/core';
import { PodcastModel } from 'src/app/core/interfaces/podcast.interface';
import { TypeList } from 'src/app/core/models/general.model';
import { ImageZoomOverlayComponent } from 'src/app/shared/components/image-zoom-overlay/image-zoom-overlay.component';
import { SocialMediaShareComponent } from 'src/app/shared/components/social-media/social-media-share.component';
import { TextBackgroundComponent } from 'src/app/shared/components/text/text-background/text-background.component';
import { TextEditorComponent } from 'src/app/shared/components/text/text-editor/text-editor.component';
import { TextSubTitleComponent } from 'src/app/shared/components/text/text-subTitle/text-subtitle.component';
import { TextTitleComponent } from 'src/app/shared/components/text/text-title/text-title.component';
import { HmsPipe } from 'src/app/shared/pipe/dateTime_form.pipe';
import { ItemImagePipe } from 'src/app/shared/pipe/item-img.pipe';
import { buildShareUrl } from 'src/app/shared/utils/share-url.util';
import { environments } from 'src/environments/environments';

@Component({
  selector: 'app-modal-show-podcast',
  imports: [
    TextTitleComponent,
    ItemImagePipe,
    TextBackgroundComponent,
    TextEditorComponent,
    DatePipe,
    HmsPipe,
    TextSubTitleComponent,
    SocialMediaShareComponent,
    ImageZoomOverlayComponent,
  ],
  templateUrl: './modal-show-podcast.component.html',
})
export class ModalShowPodcastComponent {
  @Input() item!: PodcastModel;
  @Input() isDashboard = false;
  typeModal: TypeList = TypeList.Podcasts;
  showZoom = false;
  openZoom() {
    this.showZoom = true;
  }
  closeZoom() {
    this.showZoom = false;
  }
  get shareTitle(): string {
    const base = this.item?.title ?? 'Podcasts';
    const full = this.item?.episode
      ? `${base} — Episodio ${this.item.episode}`
      : base;
    return full;
  }

  get shareUrl(): string {
    return this.item?.id
      ? buildShareUrl({
          base: environments.publicBaseUrl,
          path: `/podcasts/${this.item.id}`,
        })
      : '';
  }
}
