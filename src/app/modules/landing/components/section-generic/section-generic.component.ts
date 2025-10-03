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
import { ModalNavService } from 'src/app/shared/components/modal/services/modal-nav.service';
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
  private readonly modalNav = inject(
    ModalNavService<EventModelFullData | MacroeventModelFullData>
  );

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

  private getQueryKey(): string {
    switch (this.typeSection) {
      case TypeList.Events:
        return 'event';
      case TypeList.Books:
        return 'book';
      case TypeList.Movies:
        return 'movie';
      case TypeList.Piteras:
        return 'pitera';
      case TypeList.Recipes:
        return 'recipe';
      case TypeList.Podcasts:
        return 'podcast';
      case TypeList.Macroevents:
        return 'macroevent';
      default:
        return 'item';
    }
  }
  constructor() {}

  ngOnInit(): void {
    if (this.typeSection === undefined) {
      this.typeSection = TypeList.Books;
    }
    if (this.typeModal === undefined) {
      this.typeModal = TypeList.Books;
    }
    this.selectedTypeModal = this.typeSection;

    const key = this.getQueryKey();

    this.route.queryParamMap
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((qp) => {
        const idParam = qp.get(key);
        if (idParam) {
          const id = +idParam;
          this.openById(id);
        } else {
          this.closeModalOnly();
        }
      });
  }
  openModalView(item: any) {
    const key = this.getQueryKey();
    this.router.navigate([], {
      relativeTo: this.route,
      queryParams: { [key]: item.id },
      queryParamsHandling: 'merge',
    });

    this.selectedItem = item;
    this.selectedTypeModal = this.typeSection;
    this.selectedActionModal = TypeActionModal.Show;
    this.showModalView = true;
  }

  onCloseModal() {
    const key = this.getQueryKey();
    this.router.navigate([], {
      relativeTo: this.route,
      queryParams: { [key]: null },
      queryParamsHandling: 'merge',
    });

    this.showModalView = false;
    this.selectedItem = null;
    this.modalNav.clear(); // 🔑 limpia la pila al cerrar completamente
  }

  private openById(id: number) {
    const local = this.data?.find((x) => x?.id === id);
    if (local) {
      this.selectedItem = local;
      this.selectedTypeModal = this.typeSection;
      this.selectedActionModal = TypeActionModal.Show;
      this.showModalView = true;
      this.modalNav.clear(); // entrada directa, sin “volver”
      return;
    }

    switch (this.typeSection) {
      case TypeList.Events:
        this.eventsService.getEventById(id).subscribe({
          next: (event: EventModelFullData) => {
            this.selectedItem = event;
            this.selectedTypeModal = TypeList.Events;
            this.selectedActionModal = TypeActionModal.Show;
            this.showModalView = true;
            this.modalNav.clear();
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
    this.selectedItem = null;
    this.modalNav.clear();
  }

  // 🔁 Abrir Macroevento desde un Evento (con “volver”)
  onOpenMacroevent(macroeventId: number) {
    // Guarda el estado actual
    this.modalNav.push({
      typeModal: this.selectedTypeModal,
      action: this.selectedActionModal,
      item: this.selectedItem,
    });

    this.macroeventsService.getMacroeventById(macroeventId).subscribe({
      next: (macro: MacroeventModelFullData) => {
        this.selectedItem = macro;
        this.selectedTypeModal = TypeList.Macroevents;
        this.selectedActionModal = TypeActionModal.Show;
        // modal ya está abierta
      },
      error: (err) => console.error('Error cargando macroevento', err),
    });
  }

  // 🔁 Abrir Evento desde un Macroevento (con “volver”)
  onOpenEvent(eventId: number) {
    // Guarda el estado actual
    this.modalNav.push({
      typeModal: this.selectedTypeModal,
      action: this.selectedActionModal,
      item: this.selectedItem,
    });

    this.eventsService.getEventById(eventId).subscribe({
      next: (event: EventModelFullData) => {
        this.selectedItem = event;
        this.selectedTypeModal = TypeList.Events;
        this.selectedActionModal = TypeActionModal.Show;
      },
      error: (err) => console.error('Error cargando evento', err),
    });
  }

  // ⬅️ Volver al paso anterior de la pila
  onBackModal(): void {
    const prev = this.modalNav.pop();
    if (!prev) return;
    this.selectedActionModal = prev.action;
    this.selectedItem = prev.item;
    this.selectedTypeModal = prev.typeModal;
  }

  // Para el template
  get canGoBack(): boolean {
    return this.modalNav.canGoBack();
  }
}
