import { Component, Input } from '@angular/core';
import { PiteraModel } from 'src/app/core/interfaces/pitera.interface';
import { TypeList } from 'src/app/core/models/general.model';
import { ButtonIconComponent } from 'src/app/shared/components/buttons/button-icon/button-icon.component';
import { ImageZoomOverlayComponent } from 'src/app/shared/components/image-zoom-overlay/image-zoom-overlay.component';
import { ModalPdfComponent } from 'src/app/shared/components/modal/pages/modal-pdf/modal-pdf.component';
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
    ModalPdfComponent,
    ImageZoomOverlayComponent,
  ],
  templateUrl: './modal-show-pitera.component.html',
})
export class ModalShowPiteraComponent {
  @Input() item!: PiteraModel;
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
    this.selectedPdf = this.buildFullUrl(file);
    this.showPdf = true;
  }

  onPdfOpenChange(open: boolean) {
    this.showPdf = open;
    if (!open) this.selectedPdf = null;
  }

  /** Devuelve:
   *  - si file es absoluto (http/https o empieza por /) => file tal cual
   *  - si file es relativo con subcarpetas => /uploads/pdf/PITERAS/<sub/archivo.pdf>
   *  - si file es solo nombre => /uploads/pdf/PITERAS/<archivo.pdf>
   */
  private buildFullUrl(file: string): string {
    if (!file) return '';

    // Absolutas o ya bajo /uploads/pdf/PITERAS
    if (/^https?:\/\//i.test(file) || file.startsWith('/')) return file;

    const base = this.basePath.endsWith('/')
      ? this.basePath.slice(0, -1)
      : this.basePath;

    // Si el nombre trae subcarpetas, preserva los '/' (encodeURI)
    if (file.includes('/')) {
      return `${base}${this.typeFolder}/${encodeURI(file)}`;
    }

    // Si es solo el nombre, escápalo completo (sin slashes)
    return `${base}${this.typeFolder}/${encodeURIComponent(file)}`;
  }
}
