import { Component, Input } from '@angular/core';
import { TypeList } from 'src/app/core/models/general.model';
import { ImgBrokenDirective } from 'src/app/shared/directives/img-broken.directive';
import { ItemImagePipe } from 'src/app/shared/pipe/item-img.pipe';

@Component({
  selector: 'app-img-modal',
  templateUrl: './img-modal.component.html',
  styleUrls: ['./img-modal.component.css'],
  imports: [ItemImagePipe, ImgBrokenDirective],
})
export class ImagenModal {
  @Input() img?: string = '';
  @Input() title?: string = '';
  @Input() type?: TypeList | undefined;
}
