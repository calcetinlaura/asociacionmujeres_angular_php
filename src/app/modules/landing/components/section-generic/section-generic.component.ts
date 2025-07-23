import { CommonModule } from '@angular/common';
import { Component, inject, Input, OnInit } from '@angular/core';
import { BookModel } from 'src/app/core/interfaces/book.interface';
import {
  EventModel,
  EventModelFullData,
} from 'src/app/core/interfaces/event.interface';
import { MacroeventModelFullData } from 'src/app/core/interfaces/macroevent.interface';
import { MovieModel } from 'src/app/core/interfaces/movie.interface';
import { PiteraModel } from 'src/app/core/interfaces/pitera.interface';
import { RecipeModel } from 'src/app/core/interfaces/recipe.interface';
import { TypeActionModal, TypeList } from 'src/app/core/models/general.model';
import { EventsService } from 'src/app/core/services/events.services';
import { MacroeventsService } from 'src/app/core/services/macroevents.services';
import { ModalComponent } from 'src/app/shared/components/modal/modal.component';
import { CardPlayerComponent } from '../card/card.component';

@Component({
  selector: 'app-section-generic',
  imports: [CardPlayerComponent, CommonModule, ModalComponent],
  templateUrl: './section-generic.component.html',
  styleUrl: './section-generic.component.css',
})
export class SectionGenericComponent implements OnInit {
  private readonly macroeventsService = inject(MacroeventsService);
  private readonly eventsService = inject(EventsService);

  @Input() data: any[] = [];
  @Input() total?: number = 0;
  @Input() typeSection: TypeList = TypeList.Books;
  @Input() typeModal: TypeList = TypeList.Books;
  TypeList = TypeList;
  TypeActionModal = TypeActionModal;

  Events: EventModel[] = [];
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
    if (this.typeSection === undefined) {
      this.typeSection = TypeList.Books;
    }
    if (this.typeModal === undefined) {
      this.typeModal = TypeList.Books;
    }
    this.selectedTypeModal = this.typeSection;
  }
  openModalView(item: any) {
    this.showModalView = true;
    this.selectedItem = item;
    this.selectedActionModal = TypeActionModal.Show;
  }
  onCloseModal() {
    this.showModalView = false;
    this.selectedItem = '';
  }

  onOpenMacroevent(macroeventId: number) {
    this.macroeventsService.getMacroeventById(macroeventId).subscribe({
      next: (macroevent: MacroeventModelFullData) => {
        this.selectedItem = macroevent;
        this.selectedTypeModal = TypeList.Macroevents; // 👉 Esto es clave
        this.selectedActionModal = TypeActionModal.Show;
        this.showModalView = true;
      },
      error: (err) => {
        console.error('Error cargando macroevento', err);
      },
    });
  }
  onOpenEvent(eventId: number) {
    this.eventsService.getEventById(eventId).subscribe({
      next: (event: EventModelFullData) => {
        this.selectedItem = event;
        this.selectedTypeModal = TypeList.Events; // 👉 Esto es clave
        this.selectedActionModal = TypeActionModal.Show;
        this.showModalView = true;
      },
      error: (err) => {
        console.error('Error cargando evento', err);
      },
    });
  }
}
