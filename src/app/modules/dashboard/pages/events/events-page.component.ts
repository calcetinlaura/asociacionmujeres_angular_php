import { CommonModule } from '@angular/common';
import {
  Component,
  DestroyRef,
  inject,
  OnInit,
  ViewChild,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormGroup, ReactiveFormsModule } from '@angular/forms';
import { tap } from 'rxjs';
import { EventsFacade } from 'src/app/application/events.facade';
import { ColumnModel } from 'src/app/core/interfaces/column.interface';
import { EventWithPlaceModel } from 'src/app/core/interfaces/event.interface';
import {
  Filter,
  TypeActionModal,
  TypeList,
} from 'src/app/core/models/general.model';
import { EventsService } from 'src/app/core/services/events.services';
import { DashboardHeaderComponent } from 'src/app/modules/dashboard/components/dashboard-header/dashboard-header.component';
import { TableComponent } from 'src/app/modules/dashboard/components/table/table.component';
import { FiltersComponent } from 'src/app/modules/landing/components/filters/filters.component';
import { AddButtonComponent } from 'src/app/shared/components/buttons/button-add/button-add.component';
import { InputSearchComponent } from 'src/app/shared/components/inputs/input-search/input-search.component';
import { ModalComponent } from 'src/app/shared/components/modal/modal.component';
import { ModalService } from 'src/app/shared/components/modal/services/modal.service';
import { SpinnerLoadingComponent } from 'src/app/shared/components/spinner-loading/spinner-loading.component';
import { GeneralService } from 'src/app/shared/services/generalService.service';

@Component({
  selector: 'app-events-page',
  standalone: true,
  imports: [
    CommonModule,
    DashboardHeaderComponent,
    ModalComponent,
    AddButtonComponent,
    ReactiveFormsModule,
    InputSearchComponent,
    SpinnerLoadingComponent,
    TableComponent,
    FiltersComponent,
  ],
  templateUrl: './events-page.component.html',
  styleUrl: './events-page.component.css',
})
export class EventsPageComponent implements OnInit {
  private readonly destroyRef = inject(DestroyRef);
  private readonly modalService = inject(ModalService);
  private readonly eventsFacade = inject(EventsFacade);
  private readonly eventsService = inject(EventsService);
  private readonly generalService = inject(GeneralService);

  events: EventWithPlaceModel[] = [];
  filteredEvents: EventWithPlaceModel[] = [];
  filters: Filter[] = [];

  selectedFilter: number | null = null;
  currentYear = this.generalService.currentYear;
  typeList = TypeList.Events;
  isLoading = true;
  isModalVisible = false;
  number = 0;

  item: EventWithPlaceModel | null = null;
  currentModalAction: TypeActionModal = TypeActionModal.Create;
  searchForm!: FormGroup;

  headerListEvents: ColumnModel[] = [
    { title: 'Cartel', key: 'img' },
    { title: 'Título', key: 'title' },
    { title: 'Fecha', key: 'start' },
    { title: 'Descripción', key: 'description' },
    { title: 'Espacio', key: 'placeData' },
    { title: 'Aforo', key: 'capacity' },
    { title: 'Precio', key: 'price' },
    { title: 'Estado', key: 'status' },
    { title: 'Requiere inscripción', key: 'inscription' },
  ];

  @ViewChild(InputSearchComponent)
  private inputSearchComponent!: InputSearchComponent;

  ngOnInit(): void {
    this.filters = [
      { code: '', name: 'Histórico eventos' },
      ...this.generalService.getYearFilters(2018, this.currentYear),
    ];

    this.modalService.modalVisibility$
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        tap((isVisible) => (this.isModalVisible = isVisible))
      )
      .subscribe();

    this.filterSelected(this.currentYear.toString());

    this.eventsFacade.filteredEvents$
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        tap((events) => this.updateEventState(events))
      )
      .subscribe();
  }

  filterSelected(filter: string): void {
    const year = Number(filter);
    this.selectedFilter = !isNaN(year) && year > 0 ? year : null;
    this.generalService.clearSearchInput(this.inputSearchComponent);

    if (this.selectedFilter) {
      this.eventsFacade.loadEventsByYear(this.selectedFilter);
    } else {
      this.eventsFacade.loadAllEvents();
    }
  }

  applyFilterWord(keyword: string): void {
    this.eventsFacade.applyFilterWord(keyword);
  }

  addNewEventModal(): void {
    this.openModal(TypeActionModal.Create, null);
  }

  onOpenModal(event: {
    action: TypeActionModal;
    item?: EventWithPlaceModel;
  }): void {
    this.openModal(event.action, event.item ?? null);
  }

  private openModal(
    action: TypeActionModal,
    item: EventWithPlaceModel | null
  ): void {
    this.currentModalAction = action;
    this.item = item;
    this.modalService.openModal();
  }

  onCloseModal(): void {
    this.modalService.closeModal();
  }

  confirmDeleteEvent(event: EventWithPlaceModel | null): void {
    if (!event) return;
    this.eventsFacade.deleteEvent(event.id);
    this.onCloseModal();
  }

  sendFormEvent(event: { itemId: number; newEventData: FormData }): void {
    const request$ = event.itemId
      ? this.eventsFacade.editEvent(event.itemId, event.newEventData)
      : this.eventsFacade.addEvent(event.newEventData);

    request$
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        tap(() => this.onCloseModal())
      )
      .subscribe();
  }

  private updateEventState(events: EventWithPlaceModel[] | null): void {
    if (!events) return;

    this.events = this.eventsService.sortEventsById(events);
    this.filteredEvents = [...this.events];
    this.number = this.eventsService.countEvents(events);
    this.isLoading = false;
  }
}
