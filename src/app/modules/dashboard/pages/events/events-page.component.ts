import { CommonModule } from '@angular/common';
import {
  Component,
  DestroyRef,
  ElementRef,
  OnInit,
  ViewChild,
  inject,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormGroup, ReactiveFormsModule } from '@angular/forms';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatMenuModule } from '@angular/material/menu';
import { finalize, of, switchMap, tap } from 'rxjs';
import { EventsFacade } from 'src/app/application/events.facade';
import {
  ColumnModel,
  ColumnWidth,
} from 'src/app/core/interfaces/column.interface';
import { EventModelFullData } from 'src/app/core/interfaces/event.interface';
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
import { StickyZoneComponent } from '../../components/sticky-zone/sticky-zone.component';

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
    StickyZoneComponent,
  ],
  templateUrl: './events-page.component.html',
})
export class EventsPageComponent implements OnInit {
  private readonly destroyRef = inject(DestroyRef);
  private readonly modalService = inject(ModalService);
  readonly eventsFacade = inject(EventsFacade);
  private readonly eventsService = inject(EventsService);
  private readonly generalService = inject(GeneralService);
  private readonly pdfPrintService = inject(PdfPrintService);
  readonly events$ = this.eventsFacade.visibleEvents$;

  filters: Filter[] = [];

  selectedFilter: number | null = null;
  currentYear = this.generalService.currentYear;
  typeSection = TypeList.Events;
  typeModal = TypeList.Events;

  isModalVisible = false;

  item: EventModelFullData | null = null;
  currentModalAction: TypeActionModal = TypeActionModal.Create;
  searchForm!: FormGroup;
  columnVisibility: Record<string, boolean> = {};
  displayedColumns: string[] = [];

  headerListEvents: ColumnModel[] = [
    { title: 'Cartel', key: 'img', sortable: false },
    { title: 'Título', key: 'title', sortable: true, width: ColumnWidth.XL },
    { title: 'Fecha', key: 'start', sortable: true, width: ColumnWidth.SM },
    {
      title: 'Categoría',
      key: 'category',
      sortable: true,
      width: ColumnWidth.SM,
    },
    {
      title: 'Descripción',
      key: 'description',
      sortable: true,
      innerHTML: true,
      showIndicatorOnEmpty: true,
    },
    {
      title: 'Espacio',
      key: 'espacioTable',
      sortable: true,
      width: ColumnWidth.LG,
      textAlign: 'center',
    },
    {
      title: 'Aforo',
      key: 'capacity',
      sortable: false,
      width: ColumnWidth.XS,
      textAlign: 'center',
    },
    {
      title: 'Precio',
      key: 'access',
      sortable: true,
      width: ColumnWidth.XS,
      textAlign: 'center',
    },
    {
      title: 'Estado',
      key: 'status',
      sortable: true,
      width: ColumnWidth.XS,
      textAlign: 'center',
    },
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

  @ViewChild('printArea', { static: false })
  printArea!: ElementRef<HTMLElement>;

  ngOnInit(): void {
    this.columnVisibility = this.generalService.setColumnVisibility(
      this.headerListEvents,
      ['capacity', 'organizer', 'collaborator', 'sponsor'] // Coloca las columnas que deseas ocultar aquí
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

    this.eventsFacade.visibleEvents$
      .pipe(takeUntilDestroyed(this.destroyRef))
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
    this.item = item;
    this.typeModal = typeModal;
    this.eventsFacade.clearSelectedEvent();
    this.modalService.openModal();
  }

  onCloseModal(): void {
    this.modalService.closeModal();
    this.item = null;
  }

  onDelete({ type, id, item }: { type: TypeList; id: number; item?: any }) {
    const actions: Partial<Record<TypeList, (id: number, item?: any) => void>> =
      {
        [TypeList.Events]: (x, it) => {
          const periodicId = it?.periodic_id;
          if (periodicId) {
            // 🔥 Borrar todo el grupo
            this.eventsService
              .deleteEventsByPeriodicId(periodicId)
              .pipe(
                takeUntilDestroyed(this.destroyRef),
                tap(() =>
                  this.filterSelected(this.selectedFilter?.toString() ?? '')
                )
              )
              .subscribe();
          } else {
            // 🔥 Borrar solo el evento individual
            this.eventsFacade.deleteEvent(x);
          }
        },
      };

    actions[type]?.(id, item);
  }

  sendFormEvent(event: { itemId: number; formData: FormData }): void {
    const currentItem = this.item;
    const newPeriodicId = event.formData.get('periodic_id');
    const oldPeriodicId = currentItem?.periodic_id || null;
    const isRepeatedToUnique = !!oldPeriodicId && !newPeriodicId;

    const request$ = event.itemId
      ? this.eventsFacade.editEvent(event.formData)
      : this.eventsFacade.addEvent(event.formData);

    request$
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        switchMap(() =>
          isRepeatedToUnique && oldPeriodicId
            ? this.eventsService.deleteOtherEventsByPeriodicId(
                oldPeriodicId,
                event.itemId
              )
            : of(null)
        ),
        // ❗ OJO: ya NO recargamos aquí desde el componente.
        // Deja que el Facade recargue con reloadCurrentFilter().
        finalize(() => this.onCloseModal())
      )
      .subscribe();
  }

  async printTableAsPdf(): Promise<void> {
    if (!this.printArea) return;

    await this.pdfPrintService.printElementAsPdf(this.printArea, {
      filename: 'eventos.pdf',
      preset: 'compact', // 'compact' reduce paddings en celdas
      orientation: 'landscape', // o 'landscape' si la tabla es muy ancha
      format: 'a4',
      margins: [5, 5, 5, 5], // mm
    });
  }
  getVisibleColumns() {
    return this.headerListEvents.filter(
      (col) => this.columnVisibility[col.key]
    );
  }
  // Método para actualizar las columnas visibles cuando se hace toggle
  toggleColumn(key: string): void {
    this.columnVisibility[key] = !this.columnVisibility[key];

    this.displayedColumns = this.generalService.updateDisplayedColumns(
      this.headerListEvents,
      this.columnVisibility
    );
  }
}
