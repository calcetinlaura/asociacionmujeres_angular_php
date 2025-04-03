import { Component, Input, OnInit } from '@angular/core';
import { CardPlayerComponent } from '../card/card.component';
import { CommonModule } from '@angular/common';
import { TypeActionModal, TypeList } from 'src/app/core/models/general.model';
import { ModalComponent } from 'src/app/shared/components/modal/modal.component';
import { EventWithPlaceModel } from 'src/app/core/interfaces/event.interface';
import { BookModel } from 'src/app/core/interfaces/book.interface';
import { MovieModel } from 'src/app/core/interfaces/movie.interface';
import { RecipeModel } from 'src/app/core/interfaces/recipe.interface';
import { PiteraModel } from 'src/app/core/interfaces/pitera.interface';

@Component({
  selector: 'app-section-generic',
  standalone: true,
  imports: [CardPlayerComponent, CommonModule, ModalComponent],
  templateUrl: './section-generic.component.html',
  styleUrl: './section-generic.component.css',
})
export class SectionGenericComponent implements OnInit {
  @Input() type: TypeList = TypeList.Books;
  @Input() data: any[] = [];
  @Input() total?: number = 0;
  TypeList = TypeList;
  TypeActionModal = TypeActionModal;

  Events: EventWithPlaceModel[] = [];
  Books: BookModel[] = [];
  Movies: MovieModel[] = [];
  Recipes: RecipeModel[] = [];
  Piteras: PiteraModel[] = [];

  showModalView: boolean = false;
  selectedTypeModal: TypeList = TypeList.Books;
  selectedActionModal: TypeActionModal = TypeActionModal.Show;
  selectedItem: any;

  constructor() {}

  ngOnInit(): void {
    if (this.type === undefined) {
      this.type = TypeList.Books;
    }
    this.selectedTypeModal = this.type;
  }
  openModalView(item: any) {
    this.showModalView = true;
    this.selectedItem = item;
    this.selectedActionModal = TypeActionModal.Show;
  }
  onCloseModal(action: string) {
    this.showModalView = false;
    this.selectedTypeModal = this.type;
    this.selectedItem = '';
  }
}
