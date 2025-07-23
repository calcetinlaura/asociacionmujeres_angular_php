import { Component, Input } from '@angular/core';
import { TypeList } from 'src/app/core/models/general.model';
import { ImagenModal } from '../img-modal/img-modal.components';

@Component({
  selector: 'app-modal-show-wrapper',
  templateUrl: './modal-show-wrapper.component.html',
  styleUrls: ['./modal-show-wrapper.component.css'],
  standalone: true,
  imports: [ImagenModal],
})
export class ModalShowWrapperComponent {
  @Input() item: any;
  @Input() typeModal?: TypeList;
}
