import { Component, inject, Input, LOCALE_ID } from '@angular/core';
import { RecipeModel } from 'src/app/core/interfaces/recipe.interface';
import { TypeList } from 'src/app/core/models/general.model';
import { ImageZoomOverlayComponent } from 'src/app/shared/components/image-zoom-overlay/image-zoom-overlay.component';
import { SocialMediaShareComponent } from 'src/app/shared/components/social-media/social-media-share.component';
import { TextBackgroundComponent } from 'src/app/shared/components/text/text-background/text-background.component';
import { TextEditorComponent } from 'src/app/shared/components/text/text-editor/text-editor.component';
import { TextSubTitleComponent } from 'src/app/shared/components/text/text-subTitle/text-subtitle.component';
import { TextTitleComponent } from 'src/app/shared/components/text/text-title/text-title.component';
import { ItemImagePipe } from '../../../../../../shared/pipe/item-img.pipe';

// 👇 añade estos imports
import { buildShareUrl } from 'src/app/shared/utils/share-url.util';
import { environments } from 'src/environments/environments';

@Component({
  selector: 'app-modal-show-recipe',
  imports: [
    TextBackgroundComponent,
    TextTitleComponent,
    TextSubTitleComponent,
    TextEditorComponent,
    ItemImagePipe,
    ImageZoomOverlayComponent,
    SocialMediaShareComponent,
  ],
  templateUrl: './modal-show-recipe.component.html',
})
export class ModalShowRecipeComponent {
  @Input() item!: RecipeModel;
  @Input() isDashboard = false;

  typeModal: TypeList = TypeList.Recipes;
  showZoom = false;

  private readonly locale = inject(LOCALE_ID);

  openZoom() {
    this.showZoom = true;
  }
  closeZoom() {
    this.showZoom = false;
  }

  // Título para compartir (puedes ajustar el formato)
  get shareTitle(): string {
    const base = this.item?.title ?? 'Receta';
    return this.item?.owner ? `${base} — ${this.item.owner}` : base;
  }

  get shareUrl(): string {
    return this.item?.id
      ? buildShareUrl({
          base: environments.publicBaseUrl,
          path: `/recipes/${this.item.id}`,
        })
      : '';
  }
}
