import { CommonModule } from '@angular/common';
import { Component, Input } from '@angular/core';
import { PlaceModel } from 'src/app/core/interfaces/place.interface';
import { TypeList } from 'src/app/core/models/general.model';
import { TextBackgroundComponent } from 'src/app/shared/components/text/text-background/text-background.component';
import { TextSubTitleComponent } from 'src/app/shared/components/text/text-subTitle/text-subtitle.component';
import { TextTitleComponent } from 'src/app/shared/components/text/text-title/text-title.component';
import { TextIconComponent } from 'src/app/shared/components/text/text-icon/text-icon.component';
import { TextEditorComponent } from 'src/app/shared/components/text/text-editor/text-editor.component';
import { DomSanitizer, SafeResourceUrl } from '@angular/platform-browser';
import { FilterTransformCodePipe } from 'src/app/shared/pipe/filterTransformCode.pipe';
import { MapComponent } from 'src/app/shared/components/map/map.component';

@Component({
  selector: 'app-modal-show-place',
  standalone: true,
  imports: [
    CommonModule,
    TextBackgroundComponent,
    TextTitleComponent,
    TextSubTitleComponent,
    TextIconComponent,
    TextEditorComponent,
    FilterTransformCodePipe,
    MapComponent,
  ],
  templateUrl: './modal-show-place.component.html',
})
export class ModalShowPlaceComponent {
  @Input() item!: PlaceModel;
  type: TypeList = TypeList.Places;
  safeMapUrl: SafeResourceUrl | null = null;

  constructor(private sanitizer: DomSanitizer) {}
  ngOnInit(): void {
    if (typeof this.item.salas === 'string') {
      this.item.salas = JSON.parse(this.item.salas);
    }
  }
}
