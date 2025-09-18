import { CommonModule } from '@angular/common';
import { Component, DestroyRef, inject, Input, OnInit } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ActivatedRoute, Router } from '@angular/router';
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
import { CardPlayerComponent } from '../cards/card-events/card-events.component';
import { CardComponent } from '../cards/card/card.component';

@Component({
  selector: 'app-section-generic',
  imports: [CardComponent, CommonModule, ModalComponent, CardPlayerComponent],
  templateUrl: './section-generic.component.html',
  styleUrl: './section-generic.component.css',
})
export class SectionGenericComponent implements OnInit {
  private readonly macroeventsService = inject(MacroeventsService);
  private readonly eventsService = inject(EventsService);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);
  private readonly destroyRef = inject(DestroyRef);

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
    // 🔎 1) Escuchar la URL: si hay :id, abrir la modal con ese id
    this.route.paramMap
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((params) => {
        const idParam = params.get('id');
        if (idParam) {
          const id = +idParam;
          this.openById(id);
        } else {
          this.closeModalOnly();
        }
      });
  }
  openModalView(item: any) {
    // 1) Cambia la URL (/events/:id o /books/:id)
    const segment = this.getRouteSegment();
    this.router.navigate(['/', segment, item.id]);

    // 2) Abre la modal con el item (UI rápida); luego, si quieres, refrescas del backend
    this.selectedItem = item;
    this.selectedActionModal = TypeActionModal.Show;
    this.showModalView = true;
  }
  onCloseModal() {
    this.showModalView = false;
    this.selectedItem = ''; // 🧹 Volver a la URL base (/events o /books) al cerrar
    const segment = this.getRouteSegment();
    this.router.navigate(['/', segment]);
  }
  // 🚪 Abrir por id (cuando viene en la URL o cambias entre ids)
  private openById(id: number) {
    // 1) Busca primero en los datos que ya tienes
    const local = this.data?.find((x) => x?.id === id);
    if (local) {
      this.selectedItem = local;
      this.selectedTypeModal = this.typeSection;
      this.selectedActionModal = TypeActionModal.Show;
      this.showModalView = true;
      return;
    }

    // 2) Si no está, pide al backend según el tipo de sección
    switch (this.typeSection) {
      case TypeList.Events:
        this.eventsService.getEventById(id).subscribe({
          next: (event: EventModelFullData) => {
            this.selectedItem = event;
            this.selectedTypeModal = TypeList.Events;
            this.selectedActionModal = TypeActionModal.Show;
            this.showModalView = true;
          },
          error: (err) => console.error('Error cargando evento', err),
        });
        break;

      default:
        console.warn('openById: tipo no implementado', this.typeSection);
        break;
    }
  }

  private closeModalOnly() {
    this.showModalView = false;
    this.selectedItem = '';
  }

  // 🧭 De TypeList → 'events' | 'books' | ...
  private getRouteSegment(): string {
    switch (this.typeSection) {
      case TypeList.Events:
        return 'events';
      case TypeList.Books:
        return 'books';
      case TypeList.Movies:
        return 'movies';
      case TypeList.Piteras:
        return 'piteras';
      case TypeList.Recipes:
        return 'recipes';
      case TypeList.Podcasts:
        return 'podcasts';
      default:
        return 'events';
    }
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
