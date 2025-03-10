import {
  Component,
  DestroyRef,
  ElementRef,
  HostListener,
  inject,
  OnInit,
  ViewChild,
} from '@angular/core';
import { DashboardHeaderComponent } from '../../components/dashboard-header/dashboard-header.component';
import { TypeActionModal, TypeList } from 'src/app/core/models/general.model';
import { ColumnModel } from 'src/app/core/interfaces/column.interface';
import { EventsService } from 'src/app/core/services/events.services';
import { TableComponent } from '../../components/table/table.component';
import { ModalComponent } from 'src/app/shared/components/modal/modal.component';
import { CommonModule } from '@angular/common';
import { EventsFacade } from 'src/app/application';
import { FormControl, FormGroup, ReactiveFormsModule } from '@angular/forms';
import { ModalService } from 'src/app/shared/components/modal/services/modal.service';
import { tap } from 'rxjs';
import { AddButtonComponent } from 'src/app/shared/components/buttons/button-add/button-add.component';
import { InputSearchComponent } from 'src/app/shared/components/inputs/input-search/input-search.component';
import { EventModel } from 'src/app/core/interfaces/event.interface';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { SpinnerLoadingComponent } from '../../../landing/components/spinner-loading/spinner-loading.component';

@Component({
  selector: 'app-events-page',
  standalone: true,
  imports: [
    CommonModule,
    DashboardHeaderComponent,
    TableComponent,
    ModalComponent,
    AddButtonComponent,
    ReactiveFormsModule,
    InputSearchComponent,
    SpinnerLoadingComponent,
  ],
  templateUrl: './events-page.component.html',
  styleUrl: './events-page.component.css',
})
export class EventsPageComponent implements OnInit {
  private eventsFacade = inject(EventsFacade);
  private modalService = inject(ModalService);
  private destroyRef = inject(DestroyRef);

  typeList = TypeList.Events;
  events: EventModel[] = [];
  filteredEvents: EventModel[] = [];
  searchForm!: FormGroup;
  dataLoaded: boolean = false;
  number: number = 0;
  headerListEvents: ColumnModel[] = [];
  isModalVisible: boolean = false;
  currentModalAction: TypeActionModal = TypeActionModal.Create;
  item: any;
  searchKeywordFilter = new FormControl();
  isStickyToolbar: boolean = false;

  @ViewChild('toolbar') toolbar!: ElementRef;

  @HostListener('window:scroll', [])
  onWindowScroll() {
    const scrollPosition =
      window.scrollY ||
      document.documentElement.scrollTop ||
      document.body.scrollTop ||
      0;

    if (scrollPosition > 50) {
      this.isStickyToolbar = true;
    } else {
      this.isStickyToolbar = false;
    }
  }

  ngOnInit(): void {
    this.loadAllEvents();

    this.modalService.modalVisibility$
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        tap((isVisible) => {
          this.isModalVisible = isVisible;
        })
      )
      .subscribe();

    this.headerListEvents = [
      { title: 'Cartel', key: 'img' },
      { title: 'Título', key: 'title' },
      { title: 'Fecha', key: 'start' },
      { title: 'Descripción', key: 'description' },
      { title: 'Espacio', key: 'place' },
      { title: 'Aforo', key: 'capacity' },
      { title: 'Precio', key: 'price' },
      { title: 'Estado', key: 'status' },
      { title: 'Requiere inscripción', key: 'inscription' },
    ];
  }

  loadAllEvents(): void {
    this.eventsFacade.loadAllEvents();
    this.eventsFacade.events$
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        tap((events) => {
          this.updateEventState(events);
        })
      )
      .subscribe();
  }

  applyFilter(keyword: string): void {
    if (!keyword) {
      this.filteredEvents = this.events; // Si no hay palabra clave, mostrar todos los libros
    } else {
      keyword = keyword.toLowerCase();
      this.filteredEvents = this.events.filter(
        (event) =>
          Object.values(event).join(' ').toLowerCase().includes(keyword) // Filtrar libros por la palabra clave
      );
    }
    this.number = this.filteredEvents.length; // Actualizar el conteo de libros filtrados
  }

  confirmDeleteEvent(item: any): void {
    this.eventsFacade.deleteEvent(item.id);
    this.onCloseModal();
  }

  addNewEventModal(): void {
    this.currentModalAction = TypeActionModal.Create;
    this.item = null;
    this.modalService.openModal();
  }

  onOpenModal(event: { action: TypeActionModal; item?: any }): void {
    this.currentModalAction = event.action;
    this.item = event.item;
    this.modalService.openModal();
  }

  onCloseModal(): void {
    this.modalService.closeModal();
  }

  sendFormEvent(event: { itemId: number; newEventData: FormData }): void {
    if (event.itemId) {
      this.eventsFacade
        .editEvent(event.itemId, event.newEventData)
        .pipe(
          takeUntilDestroyed(this.destroyRef),
          tap(() => {
            this.onCloseModal();
          })
        )
        .subscribe();
    } else {
      this.eventsFacade
        .addEvent(event.newEventData)
        .pipe(
          takeUntilDestroyed(this.destroyRef),
          tap(() => {
            this.onCloseModal();
          })
        )
        .subscribe();
    }
  }
  private updateEventState(events: EventModel[] | null): void {
    if (events === null) {
      return;
    }
    this.events = events.sort((a, b) => b.id - a.id);
    this.filteredEvents = [...this.events];
    this.number = this.events.length;
    this.dataLoaded = true;
  }
}
