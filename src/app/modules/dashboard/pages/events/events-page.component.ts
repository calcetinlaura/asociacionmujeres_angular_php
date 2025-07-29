import { CommonModule } from '@angular/common';
import {
  Component,
  DestroyRef,
  OnInit,
  ViewChild,
  inject,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormGroup, ReactiveFormsModule } from '@angular/forms';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatMenuModule } from '@angular/material/menu';
import { of, switchMap, tap } from 'rxjs';
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
import { ButtonComponent } from 'src/app/shared/components/buttons/button/button.component';
import { IconActionComponent } from 'src/app/shared/components/buttons/icon-action/icon-action.component';
import { InputSearchComponent } from 'src/app/shared/components/inputs/input-search/input-search.component';
import { ModalComponent } from 'src/app/shared/components/modal/modal.component';
import { ModalService } from 'src/app/shared/components/modal/services/modal.service';
import { SpinnerLoadingComponent } from 'src/app/shared/components/spinner-loading/spinner-loading.component';
import { GeneralService } from 'src/app/shared/services/generalService.service';
import { PdfPrintService } from 'src/app/shared/services/PdfPrintService.service';

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
    IconActionComponent,
    ButtonComponent,
    MatMenuModule,
    MatCheckboxModule,
    CommonModule,
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
  private readonly pdfPrintService = inject(PdfPrintService);

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
  columnVisibility: Record<string, boolean> = {};
  displayedColumns: string[] = [];

  headerListEvents: ColumnModel[] = [
    { title: 'Cartel', key: 'img', sortable: false },
    { title: 'Título', key: 'title', sortable: true },
    { title: 'Fecha', key: 'start', sortable: true, width: ColumnWidth.SM },
    {
      title: 'Descripción',
      key: 'description',
      sortable: true,
      showIndicatorOnEmpty: true,
      width: ColumnWidth.LG,
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
    this.columnVisibility = this.generalService.setColumnVisibility(
      this.headerListEvents,
      ['organizer', 'collaborator', 'sponsor'] // Coloca las columnas que deseas ocultar aquí
    );

    // Actualiza las columnas visibles según el estado de visibilidad
    this.displayedColumns = this.generalService.updateDisplayedColumns(
      this.headerListEvents,
      this.columnVisibility
    );
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

    if (event.periodic_id) {
      // 🔥 Borra todo el grupo de eventos repetidos
      this.eventsService
        .deleteEventsByPeriodicId(event.periodic_id)
        .pipe(
          takeUntilDestroyed(this.destroyRef),
          tap(() => this.filterSelected(this.selectedFilter?.toString() ?? ''))
        )
        .subscribe();
    } else {
      // 🔥 Borra solo el evento individual
      this.eventsFacade.deleteEvent(event.id);
    }

    this.onCloseModal();
  }

  sendFormEvent(event: { itemId: number; formData: FormData }): void {
    const currentItem = this.item; // Guarda referencia al evento actual
    const newPeriodicId = event.formData.get('periodic_id');
    const oldPeriodicId = currentItem?.periodic_id || null;

    const isRepeatedToUnique = !!oldPeriodicId && !newPeriodicId;

    const request$ = event.itemId
      ? this.eventsFacade.editEvent(event.itemId, event.formData)
      : this.eventsFacade.addEvent(event.formData);

    request$
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        switchMap(() => {
          if (isRepeatedToUnique && oldPeriodicId) {
            return this.eventsService.deleteOtherEventsByPeriodicId(
              oldPeriodicId,
              event.itemId
            );
          }
          return of(null); // ← para mantener la cadena activa
        }),
        tap(() => {
          this.onCloseModal();
        })
      )
      .subscribe();
  }

  private updateEventState(events: EventModelFullData[] | null): void {
    if (!events) return;

    this.events = this.eventsService.sortEventsById(events);
    this.number = this.eventsService.countEvents(events);
    this.isLoading = false;
  }
  printTableAsPdf(): void {
    this.pdfPrintService.printTableAsPdf('table-to-print', 'eventos.pdf');
  }
  getVisibleColumns() {
    return this.headerListEvents.filter(
      (col) => this.columnVisibility[col.key]
    );
  }
  // Método para actualizar las columnas visibles cuando se hace toggle
  toggleColumn(key: string): void {
    // Cambia la visibilidad de la columna en columnVisibility
    this.columnVisibility[key] = !this.columnVisibility[key];
    // Actualiza las columnas visibles en la tabla después de cambiar el estado
    this.displayedColumns = this.generalService.updateDisplayedColumns(
      this.headerListEvents,
      this.columnVisibility
    );
  }
}
