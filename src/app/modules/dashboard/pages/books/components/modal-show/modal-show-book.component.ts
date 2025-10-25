import { Component, Input } from '@angular/core';
import { BookModel } from 'src/app/core/interfaces/book.interface';
import { TypeList } from 'src/app/core/models/general.model';
import { ImageZoomOverlayComponent } from 'src/app/shared/components/image-zoom-overlay/image-zoom-overlay.component';
import { SocialMediaShareComponent } from 'src/app/shared/components/social-media/social-media-share.component';
import { TextBackgroundComponent } from 'src/app/shared/components/text/text-background/text-background.component';
import { TextEditorComponent } from 'src/app/shared/components/text/text-editor/text-editor.component';
import { TextSubTitleComponent } from 'src/app/shared/components/text/text-subTitle/text-subtitle.component';
import { TextTitleComponent } from 'src/app/shared/components/text/text-title/text-title.component';
import { ItemImagePipe } from 'src/app/shared/pipe/item-img.pipe';

// 👇 añade estos imports
import { buildShareUrl } from 'src/app/shared/utils/share-url.util';
import { environments } from 'src/environments/environments';

@Component({
  selector: 'app-modal-show-book',
  standalone: true,
  imports: [
    TextBackgroundComponent,
    TextTitleComponent,
    TextSubTitleComponent,
    TextEditorComponent,
    ItemImagePipe,
    ImageZoomOverlayComponent,
    SocialMediaShareComponent,
  ],
  templateUrl: './modal-show-book.component.html',
})
export class ModalShowBookComponent {
  @Input() item!: BookModel;
  @Input() isDashboard = false;

  typeModal: TypeList = TypeList.Books;
  showZoom = false;

  openZoom() {
    this.showZoom = true;
  }
  closeZoom() {
    this.showZoom = false;
  }

  //  Título para compartir (puedes personalizarlo)
  get shareTitle(): string {
    // Ejemplos: solo título / "Título — Autor"
    const base = this.item?.title ?? 'Libro';
    const full = this.item?.author ? `${base} — ${this.item.author}` : base;
    return full;
  }

  //  URL compartible: /books/:id#book-:id + (opcional) parámetro de filtro
  get shareUrl(): string {
    return this.item?.id
      ? buildShareUrl({
          base: environments.publicBaseUrl,
          path: `/books/${this.item.id}`,
        })
      : '';
  }
}
