import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Input, Output } from '@angular/core';
import { TypeActionModal, TypeList } from 'src/app/core/models/general.model';
import { CardEventsComponent } from '../cards/card-events/card-events.component';
import { CardComponent } from '../cards/card/card.component';

@Component({
  selector: 'app-section-generic',
  standalone: true,
  imports: [CommonModule, CardComponent, CardEventsComponent],
  templateUrl: './section-generic.component.html',
  styleUrls: ['./section-generic.component.css'],
})
export class SectionGenericComponent {
  @Input() data: any[] = [];
  @Input() total?: number = 0;
  @Input() typeSection: TypeList = TypeList.Books;

  @Output() itemClicked = new EventEmitter<any>();
  @Output() editClicked = new EventEmitter<any>();
  @Output() deleteClicked = new EventEmitter<any>();

  readonly TypeList = TypeList;
  readonly TypeActionModal = TypeActionModal;

  onClickItem(item: any) {
    this.itemClicked.emit(item);
  }
}
