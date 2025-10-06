import { Component, Input } from '@angular/core';
import { MovieModel } from 'src/app/core/interfaces/movie.interface';
import { TypeList } from 'src/app/core/models/general.model';
import { ImageZoomOverlayComponent } from 'src/app/shared/components/image-zoom-overlay/image-zoom-overlay.component';
import { SocialMediaShareComponent } from 'src/app/shared/components/social-media/social-media-share.component';
import { TextBackgroundComponent } from 'src/app/shared/components/text/text-background/text-background.component';
import { TextEditorComponent } from 'src/app/shared/components/text/text-editor/text-editor.component';
import { TextSubTitleComponent } from 'src/app/shared/components/text/text-subTitle/text-subtitle.component';
import { TextTitleComponent } from 'src/app/shared/components/text/text-title/text-title.component';
import { ItemImagePipe } from '../../../../../../shared/pipe/item-img.pipe';

@Component({
  selector: 'app-modal-show-movie',
  imports: [
    TextBackgroundComponent,
    TextTitleComponent,
    TextSubTitleComponent,
    TextEditorComponent,
    ItemImagePipe,
    ImageZoomOverlayComponent,
    SocialMediaShareComponent,
  ],
  templateUrl: './modal-show-movie.component.html',
})
export class ModalShowMovieComponent {
  @Input() item!: MovieModel;
  @Input() isDashboard = false;
  typeModal: TypeList = TypeList.Movies;
  showZoom = false;
  openZoom() {
    this.showZoom = true;
  }
  closeZoom() {
    this.showZoom = false;
  }
}
