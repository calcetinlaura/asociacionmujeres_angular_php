import { CommonModule, Location } from '@angular/common';
import { Component, DestroyRef, inject, Input, OnInit } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ActivatedRoute, Router } from '@angular/router';
import { Observable } from 'rxjs';

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

import { BooksService } from 'src/app/core/services/books.services';
import { EventsService } from 'src/app/core/services/events.services';
import { MacroeventsService } from 'src/app/core/services/macroevents.services';
import { MoviesService } from 'src/app/core/services/movies.services';
import { PiterasService } from 'src/app/core/services/piteras.services';
import { RecipesService } from 'src/app/core/services/recipes.services';

import { ModalComponent } from 'src/app/shared/components/modal/modal.component';
import { ModalNavService } from 'src/app/shared/components/modal/services/modal-nav.service';
import { CardEventsComponent } from '../cards/card-events/card-events.component';
import { CardComponent } from '../cards/card/card.component';

type LoaderFn = (id: number) => Observable<any>;

@Component({
  selector: 'app-section-generic',
  standalone: true,
  imports: [CardComponent, CommonModule, ModalComponent, CardEventsComponent],
  templateUrl: './section-generic.component.html',
  styleUrls: ['./section-generic.component.css'],
})
export class SectionGenericComponent implements OnInit {
  // Servicios
  private readonly macroeventsService = inject(MacroeventsService);
  private readonly eventsService = inject(EventsService);
  private readonly booksService = inject(BooksService);
  private readonly moviesService = inject(MoviesService);
  private readonly recipesService = inject(RecipesService);
  private readonly piterasService = inject(PiterasService);

  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);
  private readonly destroyRef = inject(DestroyRef);
  private readonly location = inject(Location);
  private readonly modalNav = inject(
    ModalNavService<EventModelFullData | MacroeventModelFullData>
  );

  // Inputs
  @Input() data: any[] = [];
  @Input() total?: number = 0;
  @Input() typeSection: TypeList = TypeList.Books;
  @Input() typeModal: TypeList = TypeList.Books;

  // Enums para el template
  TypeList = TypeList;
  TypeActionModal = TypeActionModal;

  // (si las necesitas en la vista)
  Events: EventModel[] = [];
  Books: BookModel[] = [];
  Movies: MovieModel[] = [];
  Recipes: RecipeModel[] = [];
  Piteras: PiteraModel[] = [];

  // Estado modal
  showModalView = false;
  selectedTypeModal: TypeList = TypeList.Books;
  selectedActionModal: TypeActionModal = TypeActionModal.Show;
  selectedItem: any;
  private openedId: number | null = null;

  constructor() {}

  // ---------- Helpers de mapeo / rutas ----------
  private baseToType(base: string): TypeList | null {
    switch (base.toLowerCase()) {
      case 'events':
        return TypeList.Events;
      case 'macroevents':
        return TypeList.Macroevents;
      case 'books':
        return TypeList.Books;
      case 'movies':
        return TypeList.Movies;
      case 'piteras':
        return TypeList.Piteras;
      case 'recipes':
        return TypeList.Recipes;
      case 'podcasts':
        return TypeList.Podcasts;
      default:
        return null;
    }
  }

  private typeToBase(t: TypeList): string {
    switch (t) {
      case TypeList.Events:
        return 'events';
      case TypeList.Macroevents:
        return 'macroevents';
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
        return this.getBasePath();
    }
  }

  private getBasePath(): string {
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
      case TypeList.Macroevents:
        return 'macroevents';
      default:
        return 'items';
    }
  }

  private parseBaseAndId(url: string): { base: string; id: number } | null {
    const clean = url.split('?')[0].split('#')[0];
    const m = /^\/([a-z]+)\/(\d+)(?:\/)?$/i.exec(clean);
    return m ? { base: m[1].toLowerCase(), id: +m[2] } : null;
  }

  // Cargadores por tipo (tipado seguro para indexar con enum)
  private loaders: Partial<Record<TypeList, LoaderFn>> = {
    [TypeList.Events]: (id: number) => this.eventsService.getEventById(id),
    [TypeList.Macroevents]: (id: number) =>
      this.macroeventsService.getMacroeventById(id),
    [TypeList.Books]: (id: number) => this.booksService.getBookById(id),
    [TypeList.Movies]: (id: number) => this.moviesService.getMovieById(id),
    [TypeList.Recipes]: (id: number) => this.recipesService.getRecipeById(id),
    [TypeList.Piteras]: (id: number) => this.piterasService.getPiteraById(id),
  };

  // ---------- Ciclo de vida ----------
  ngOnInit(): void {
    if (this.typeSection === undefined) this.typeSection = TypeList.Books;
    if (this.typeModal === undefined) this.typeModal = TypeList.Books;
    this.selectedTypeModal = this.typeSection;

    // A) Deep-link inicial (/events/:id o /macroevents/:id)
    const currentUrl = this.router.url || this.location.path();
    const parsedInit = this.parseBaseAndId(currentUrl);
    if (parsedInit) {
      const modalType = this.baseToType(parsedInit.base) ?? this.typeSection;
      this.openById(parsedInit.id, modalType, { resetStack: true });
    }

    // B) Navegaciones reales del router
    this.route.paramMap
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((pm) => {
        const idParam = pm.get('id');
        if (idParam) {
          const urlNow = this.router.url;
          const parsed = this.parseBaseAndId(urlNow);
          const modalType = parsed
            ? this.baseToType(parsed.base) ?? this.typeSection
            : this.typeSection;
          const id = +idParam;

          if (this.openedId !== id || this.selectedTypeModal !== modalType) {
            this.openById(id, modalType);
          }
        } else {
          this.closeModalOnly();
        }
      });

    // C) Cambios manuales de URL (Location.go / atrás / adelante)
    this.location.onUrlChange((url) => {
      const parsed = this.parseBaseAndId(url);
      if (parsed) {
        const modalType = this.baseToType(parsed.base) ?? this.typeSection;
        if (
          this.openedId !== parsed.id ||
          this.selectedTypeModal !== modalType
        ) {
          this.openById(parsed.id, modalType);
        }
      } else {
        this.closeModalOnly();
      }
    });
  }

  // ---------- Apertura / cierre de modal ----------
  // Abre modal desde tarjeta (URL compartible)
  openModalView(item: any) {
    const base = this.getBasePath();
    this.location.go(`/${base}/${item.id}`);

    this.modalNav.clear(); // nueva historia desde tarjeta
    this.showItem(item, this.typeSection);
  }

  // Cierra modal y limpia URL al listado actual
  onCloseModal() {
    const base = this.getBasePath();
    this.location.go(`/${base}`);

    this.showModalView = false;
    this.selectedItem = null;
    this.openedId = null;
    this.modalNav.clear();
  }

  private closeModalOnly() {
    this.showModalView = false;
    this.selectedItem = null;
    this.openedId = null;
    this.modalNav.clear();
  }

  // ---------- Navegación interna evento ⇄ macroevento (URLs compartibles) ----------
  onOpenMacroevent(macroeventId: number) {
    this.modalNav.push({
      typeModal: this.selectedTypeModal,
      action: this.selectedActionModal,
      item: this.selectedItem,
    });

    this.location.go(`/macroevents/${macroeventId}`);
    this.showModalView = true;

    this.macroeventsService.getMacroeventById(macroeventId).subscribe({
      next: (macro) => this.showItem(macro, TypeList.Macroevents),
      error: (err) => console.error('Error macroevento', err),
    });
  }

  onOpenEvent(eventId: number) {
    this.modalNav.push({
      typeModal: this.selectedTypeModal,
      action: this.selectedActionModal,
      item: this.selectedItem,
    });

    this.location.go(`/events/${eventId}`);
    this.showModalView = true;

    this.eventsService.getEventById(eventId).subscribe({
      next: (event) => this.showItem(event, TypeList.Events),
      error: (err) => console.error('Error evento', err),
    });
  }

  // ---------- Back en la pila de la modal (actualiza URL para compartir) ----------
  onBackModal(): void {
    const prev = this.modalNav.pop();
    if (!prev) return;

    // Sincroniza estado
    this.selectedActionModal = prev.action;
    this.selectedItem = prev.item;
    this.selectedTypeModal = prev.typeModal;
    this.showModalView = true;
    this.openedId = prev.item?.id ?? null;

    // ⚠️ Actualiza la URL para que también sea compartible
    const base = this.typeToBase(prev.typeModal);
    if (this.openedId != null) {
      this.location.go(`/${base}/${this.openedId}`);
    } else {
      // fallback en caso de no tener id
      this.location.go(`/${base}`);
    }
  }

  get canGoBack(): boolean {
    return this.modalNav.canGoBack();
  }

  // ---------- Core helpers ----------
  private showItem(
    item: any,
    modalType: TypeList,
    opts: { resetStack?: boolean } = {}
  ) {
    this.selectedItem = item;
    this.selectedTypeModal = modalType;
    this.selectedActionModal = TypeActionModal.Show;
    this.showModalView = true;
    this.openedId = item?.id ?? null;

    if (opts.resetStack) {
      this.modalNav.clear();
    }
  }

  private openById(
    id: number,
    modalType: TypeList = this.typeSection,
    opts: { resetStack?: boolean } = {}
  ) {
    if (
      this.openedId === id &&
      this.showModalView &&
      this.selectedTypeModal === modalType
    ) {
      return;
    }

    // Si ya está en la lista local y coincide el tipo de sección
    const local = this.data?.find((x) => x?.id === id);
    if (local && modalType === this.typeSection) {
      this.showItem(local, this.typeSection, opts);
      return;
    }

    // Carga remota por tipo
    const loader = this.loaders[modalType];
    if (!loader) {
      console.warn('openById: tipo no implementado', modalType);
      return;
    }

    loader(id).subscribe({
      next: (item: any) => this.showItem(item, modalType, opts),
      error: (err: any) =>
        console.error(`Error cargando ${this.typeToBase(modalType)}`, err),
    });
  }
}
