import { Component, EventEmitter, Input, Output } from '@angular/core';
import { PiteraModel } from 'src/app/core/interfaces/pitera.interface';
import { TypeList } from 'src/app/core/models/general.model';
import { ButtonIconComponent } from 'src/app/shared/components/buttons/button-icon/button-icon.component';
import { ImageZoomOverlayComponent } from 'src/app/shared/components/image-zoom-overlay/image-zoom-overlay.component';
import { SocialMediaShareComponent } from 'src/app/shared/components/social-media/social-media-share.component';
import { TextBackgroundComponent } from 'src/app/shared/components/text/text-background/text-background.component';
import { TextEditorComponent } from 'src/app/shared/components/text/text-editor/text-editor.component';
import { TextSubTitleComponent } from 'src/app/shared/components/text/text-subTitle/text-subtitle.component';
import { TextTitleComponent } from 'src/app/shared/components/text/text-title/text-title.component';
import { ItemImagePipe } from '../../../../../../shared/pipe/item-img.pipe';

@Component({
  selector: 'app-modal-show-pitera',
  imports: [
    TextTitleComponent,
    TextSubTitleComponent,
    ItemImagePipe,
    TextBackgroundComponent,
    TextEditorComponent,
    ButtonIconComponent,
    ImageZoomOverlayComponent,
    SocialMediaShareComponent,
  ],
  templateUrl: './modal-show-pitera.component.html',
})
export class ModalShowPiteraComponent {
  @Input() item!: PiteraModel;
  @Input() isDashboard = false;
  @Output() openPdfReq = new EventEmitter<{
    url: string;
    year: number | null;
    type: TypeList;
  }>();

  typeModal: TypeList = TypeList.Piteras;
  showPdf = false;
  selectedPdf: string | null = null;
  private basePath = '/uploads/pdf';
  private typeFolder = '/PITERAS';
  showZoom = false;
  openZoom() {
    this.showZoom = true;
  }
  closeZoom() {
    this.showZoom = false;
  }

  openPdf(): void {
    const file = this.item?.url || (this as any).item?.file;
    if (!file) return;
    const url = this.buildFullUrl(file);
    this.openPdfReq.emit({
      url,
      year: this.item.year ?? null,
      type: this.typeModal,
    });
  }

  private buildFullUrl(file: string): string {
    if (!file) return '';
    if (/^https?:\/\//i.test(file) || file.startsWith('/')) return file;
    const base = this.basePath.endsWith('/')
      ? this.basePath.slice(0, -1)
      : this.basePath;
    if (file.includes('/'))
      return `${base}${this.typeFolder}/${encodeURI(file)}`;
    return `${base}${this.typeFolder}/${encodeURIComponent(file)}`;
  }
}
