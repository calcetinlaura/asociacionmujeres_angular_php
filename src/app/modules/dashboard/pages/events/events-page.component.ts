import {
  Component,
  DestroyRef,
  OnInit,
  ViewChild,
  inject,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormGroup, ReactiveFormsModule } from '@angular/forms';
import { tap } from 'rxjs';
import { EventsFacade } from 'src/app/application/events.facade';
import {
  ColumnModel,
  ColumnWidth,
} from 'src/app/core/interfaces/column.interface';
import {
  EventModel,
  EventModelFullData,
} from 'src/app/core/interfaces/event.interface';
import {
  Filter,
  TypeActionModal,
  TypeList,
} from 'src/app/core/models/general.model';
import { EventsService } from 'src/app/core/services/events.services';
import { DashboardHeaderComponent } from 'src/app/modules/dashboard/components/dashboard-header/dashboard-header.component';
import { TableComponent } from 'src/app/modules/dashboard/components/table/table.component';
import { FiltersComponent } from 'src/app/modules/landing/components/filters/filters.component';
import { ButtonIconComponent } from 'src/app/shared/components/buttons/button-icon/button-icon.component';
import { InputSearchComponent } from 'src/app/shared/components/inputs/input-search/input-search.component';
import { ModalComponent } from 'src/app/shared/components/modal/modal.component';
import { ModalService } from 'src/app/shared/components/modal/services/modal.service';
import { SpinnerLoadingComponent } from 'src/app/shared/components/spinner-loading/spinner-loading.component';
import { GeneralService } from 'src/app/shared/services/generalService.service';

@Component({
  selector: 'app-events-page',
  standalone: true,
  imports: [
    DashboardHeaderComponent,
    ModalComponent,
    ButtonIconComponent,
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

  events: EventModelFullData[] = [];
  filters: Filter[] = [];

  selectedFilter: number | null = null;
  currentYear = this.generalService.currentYear;
  typeSection = TypeList.Events;
  typeModal = TypeList.Events;
  isLoading = true;
  isModalVisible = false;
  number = 0;

  item: EventModelFullData | null = null;
  currentModalAction: TypeActionModal = TypeActionModal.Create;
  searchForm!: FormGroup;

  headerListEvents: ColumnModel[] = [
    { title: 'Cartel', key: 'img', sortable: false },
    { title: 'Título', key: 'titleEvent', sortable: true },
    { title: 'Fecha', key: 'start', sortable: true, width: ColumnWidth.SM },
    {
      title: 'Descripción',
      key: 'description',
      sortable: true,
      booleanIndicator: true,
      width: ColumnWidth.SM,
    },
    {
      title: 'Espacio',
      key: 'espacioTable',
      sortable: true,
      width: ColumnWidth.LG,
    },
    { title: 'Aforo', key: 'capacity', sortable: false, width: ColumnWidth.XS },
    { title: 'Precio', key: 'price', sortable: true, width: ColumnWidth.XS },
    { title: 'Estado', key: 'status', sortable: true, width: ColumnWidth.XS },
    {
      title: 'Inscripción',
      key: 'inscription',
      sortable: true,
      booleanIndicator: true,
      width: ColumnWidth.SM,
    },
    {
      title: 'Organizador',
      key: 'organizer',
      sortable: true,
      showIndicatorOnEmpty: true,
      width: ColumnWidth.SM,
    },
    {
      title: 'Colaborador',
      key: 'collaborator',
      sortable: true,
      showIndicatorOnEmpty: true,
      width: ColumnWidth.SM,
    },
    {
      title: 'Patrocinador',
      key: 'sponsor',
      sortable: true,
      showIndicatorOnEmpty: true,
      width: ColumnWidth.SM,
    },
  ];

  @ViewChild(InputSearchComponent)
  private inputSearchComponent!: InputSearchComponent;

  ngOnInit(): void {
    this.filters = [
      ...this.generalService.getYearFilters(2018, this.currentYear),
    ];

    this.modalService.modalVisibility$
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        tap((isVisible) => (this.isModalVisible = isVisible))
      )
      .subscribe();

    this.filterSelected(this.currentYear.toString());

    this.eventsFacade.nonRepeatedEvents$
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        tap((events) => this.updateEventState(events))
      )
      .subscribe();
  }

  filterSelected(filter: string): void {
    this.selectedFilter = Number(filter);
    this.generalService.clearSearchInput(this.inputSearchComponent);

    this.eventsFacade.loadNonRepeatedEventsByYear(Number(filter));
  }

  applyFilterWord(keyword: string): void {
    this.eventsFacade.applyFilterWord(keyword);
  }

  addNewEventModal(): void {
    this.openModal(this.typeModal, TypeActionModal.Create, null);
  }

  onOpenModal(event: {
    typeModal: TypeList;
    action: TypeActionModal;
    item?: EventModelFullData;
  }): void {
    this.openModal(event.typeModal, event.action, event.item ?? null);
  }

  private openModal(
    typeModal: TypeList,
    action: TypeActionModal,
    item: EventModelFullData | null
  ): void {
    this.currentModalAction = action;
    if (action === TypeActionModal.Duplicate && item) {
      this.item = { ...item, id: 0 }; // Clonar sin ID
    } else {
      this.item = item;
    }
    this.typeModal = typeModal;
    this.modalService.openModal();
  }

  onCloseModal(): void {
    this.modalService.closeModal();
    this.item = null;
  }

  confirmDeleteEvent(event: EventModel | null): void {
    if (!event) return;
    this.eventsFacade.deleteEvent(event.id);
    this.onCloseModal();
  }

  sendFormEvent(event: { itemId: number; formData: FormData }): void {
    const request$ = event.itemId
      ? this.eventsFacade.editEvent(event.itemId, event.formData)
      : this.eventsFacade.addEvent(event.formData);

    request$
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        tap(() => this.onCloseModal())
      )
      .subscribe();
  }

  private updateEventState(events: EventModelFullData[] | null): void {
    if (!events) return;

    this.events = this.eventsService.sortEventsById(events);
    this.number = this.eventsService.countEvents(events);
    this.isLoading = false;
  }
}
