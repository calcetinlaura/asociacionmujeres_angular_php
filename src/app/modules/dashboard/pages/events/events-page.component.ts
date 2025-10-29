import { CommonModule } from '@angular/common';
import {
  Component,
  DestroyRef,
  ElementRef,
  OnInit,
  ViewChild,
  computed,
  inject,
} from '@angular/core';
import { takeUntilDestroyed, toSignal } from '@angular/core/rxjs-interop';
import { ReactiveFormsModule } from '@angular/forms';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatMenuModule } from '@angular/material/menu';
import { filter, finalize, of, switchMap, take, tap } from 'rxjs';

import { EventsFacade } from 'src/app/application/events.facade';
import { ModalFacade } from 'src/app/application/modal.facade';
import {
  ColumnModel,
  ColumnWidth,
} from 'src/app/core/interfaces/column.interface';
import { EventModelFullData } from 'src/app/core/interfaces/event.interface';
import { Filter } from 'src/app/core/interfaces/general.interface';
import { MacroeventModelFullData } from 'src/app/core/interfaces/macroevent.interface';
import { TypeActionModal, TypeList } from 'src/app/core/models/general.model';

import { GeneralService } from 'src/app/core/services/generalService.service';
import { PdfPrintService } from 'src/app/core/services/PdfPrintService.service';
import { DashboardHeaderComponent } from 'src/app/shared/components/dashboard-header/dashboard-header.component';
import { FiltersComponent } from 'src/app/shared/components/filters/filters.component';
import { PageToolbarComponent } from 'src/app/shared/components/page-toolbar/page-toolbar.component';
import { SpinnerLoadingComponent } from 'src/app/shared/components/spinner-loading/spinner-loading.component';
import { StickyZoneComponent } from 'src/app/shared/components/sticky-zone/sticky-zone.component';
import { TableComponent } from 'src/app/shared/components/table/table.component';
import { useColumnVisibility } from 'src/app/shared/hooks/use-column-visibility';
import { useEntityList } from 'src/app/shared/hooks/use-entity-list';

import { EventsReportsFacade } from 'src/app/application/events-reports.facade';
import { FiltersFacade } from 'src/app/application/filters.facade';
import { MacroeventsFacade } from 'src/app/application/macroevents.facade';
import { ButtonFilterComponent } from 'src/app/shared/components/buttons/button-filter/button-filter.component';
import { ModalShellComponent } from 'src/app/shared/components/modal/modal-shell.component';
import { count, sortById } from 'src/app/shared/utils/facade.utils';

@Component({
  selector: 'app-events-page',
  standalone: true,
  imports: [
    DashboardHeaderComponent,
    SpinnerLoadingComponent,
    StickyZoneComponent,
    TableComponent,
    FiltersComponent,
    PageToolbarComponent,
    CommonModule,
    ReactiveFormsModule,
    MatMenuModule,
    MatCheckboxModule,
    ButtonFilterComponent,
    ModalShellComponent,
  ],
  templateUrl: './events-page.component.html',
})
export class EventsPageComponent implements OnInit {
  private readonly destroyRef = inject(DestroyRef);
  private readonly generalService = inject(GeneralService);
  private readonly pdfPrintService = inject(PdfPrintService);

  readonly eventsFacade = inject(EventsFacade);
  readonly macroeventsFacade = inject(MacroeventsFacade);
  readonly eventsReportsFacade = inject(EventsReportsFacade);
  readonly modalFacade = inject(ModalFacade);
  readonly filtersFacade = inject(FiltersFacade);

  readonly TypeList = TypeList;
  currentYear = this.generalService.currentYear;

  // ── Señales de carga
  readonly isEventsLoadingSig = toSignal(this.eventsFacade.isListLoading$, {
    initialValue: false,
  });
  readonly isReportsLoadingSig = toSignal(
    this.eventsReportsFacade.isLoadingList$,
    { initialValue: false }
  );
  readonly isLoadingSig = computed(
    () => this.isEventsLoadingSig() || this.isReportsLoadingSig()
  );

  // ── Señales de modal
  readonly modalVisibleSig = this.modalFacade.isVisibleSig;
  readonly currentModalTypeSig = this.modalFacade.typeSig;
  readonly currentModalActionSig = this.modalFacade.actionSig;
  readonly currentItemSig = this.modalFacade.itemSig;

  // ── IDs con informe
  readonly eventIdsWithReportSig = toSignal(
    this.eventsReportsFacade.eventIdsWithReport$,
    { initialValue: [] }
  );

  @ViewChild(PageToolbarComponent)
  private toolbarComponent!: PageToolbarComponent;

  headerListEvents: ColumnModel[] = [
    { title: 'Cartel', key: 'img', sortable: true },
    { title: 'Título', key: 'title', sortable: true, width: ColumnWidth.XL },
    { title: 'Fecha', key: 'start', sortable: true, width: ColumnWidth.SM },
    {
      title: 'Categoría',
      key: 'category',
      sortable: true,
      width: ColumnWidth.XS,
    },
    {
      title: 'Público',
      key: 'audience',
      sortable: true,
      showIndicatorOnEmpty: true,
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
      title: 'Resumen',
      key: 'summary',
      sortable: true,
      booleanIndicator: true,
      width: ColumnWidth.XS,
    },
    {
      title: 'Espacio',
      key: 'place_id',
      sortable: true,
      showIndicatorOnEmpty: true,
      width: ColumnWidth.LG,
      textAlign: 'center',
    },
    {
      title: 'Aforo',
      key: 'capacity',
      sortable: true,
      width: ColumnWidth.XS,
      textAlign: 'center',
      showIndicatorOnEmpty: true,
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
    {
      title: 'Publicación',
      key: 'published',
      sortable: true,
      width: ColumnWidth.SM,
    },
  ];

  readonly col = useColumnVisibility('events-table', this.headerListEvents, [
    'capacity',
    'organizer',
    'collaborator',
    'sponsor',
    'status',
    'summary',
    'published',
  ]);

  // ── Lista
  readonly list = useEntityList<EventModelFullData>({
    filtered$: this.eventsFacade.visibleEvents$,
    sort: (arr) => sortById(arr),
    count: (arr) => count(arr),
  });

  // ── Estado local
  activeScope: 'all' | 'drafts' | 'scheduled' = 'all';
  private lastYearSelected = this.currentYear;
  item: EventModelFullData | MacroeventModelFullData | null = null;

  // ── View ref
  @ViewChild('printArea', { static: false })
  printArea!: ElementRef<HTMLElement>;

  // ── Lifecycle
  ngOnInit(): void {
    // Inicializa los filtros desde la fachada
    this.filtersFacade.loadFiltersFor(
      TypeList.Events,
      this.currentYear.toString(),
      2018
    );

    // Selección inicial
    this.filterSelected(String(this.filtersFacade.selectedSig()));

    this.eventsReportsFacade.loadEventIdsWithReport();

    this.eventsFacade.visibleEvents$
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe();
  }

  // ── Getters reactivos de filtros
  get filters(): Filter[] {
    return this.filtersFacade.filtersSig();
  }

  get selectedFilter(): string | number {
    return this.filtersFacade.selectedSig();
  }

  // ── Filtro principal
  filterSelected(filter: string): void {
    if (this.toolbarComponent) {
      this.toolbarComponent.clearSearch();
    }
    if (filter === 'drafts') return this.showDrafts();
    if (filter === 'scheduled') return this.showScheduled();

    const year = Number(filter);
    if (!Number.isFinite(year)) return;

    this.filtersFacade.selectFilter(String(year));
    this.lastYearSelected = year;
    this.activeScope = 'all';
    this.eventsFacade.applyFilterWord('');
    this.eventsFacade.loadDashboardAllGrouped(year);
  }

  showDrafts(): void {
    this.activeScope = 'drafts';
    this.filtersFacade.selectFilter('drafts');
    this.eventsFacade.applyFilterWord('');
    this.eventsFacade.loadDashboardDrafts(
      this.lastYearSelected,
      'groupedByPeriodicId'
    );
  }

  showScheduled(): void {
    this.activeScope = 'scheduled';
    this.filtersFacade.selectFilter('scheduled');
    this.eventsFacade.applyFilterWord('');
    this.eventsFacade.loadDashboardScheduled(
      this.lastYearSelected,
      'groupedByPeriodicId'
    );
  }

  applyFilterWord(keyword: string): void {
    this.eventsFacade.applyFilterWord(keyword);
  }

  // ── Modal + navegación
  addNewEventModal(): void {
    this.eventsFacade.clearSelectedEvent();
    this.modalFacade.open(TypeList.Events, TypeActionModal.Create, null);
  }

  onOpenModal(event: {
    typeModal: TypeList;
    action: TypeActionModal;
    item?: any;
  }): void {
    if (event.typeModal === TypeList.EventsReports) {
      this.openReportModal(event.action, event.item);
    } else {
      this.modalFacade.open(event.typeModal, event.action, event.item ?? null);
    }
  }

  private openReportModal(action: TypeActionModal, item: any): void {
    this.modalFacade.open(TypeList.EventsReports, action, item);
    if (action === TypeActionModal.Edit && item?.id) {
      this.eventsReportsFacade.loadReportByEventId(item.id);
    }
  }

  onOpenEvent(eventId: number): void {
    this.eventsFacade.loadEventById(eventId);

    this.eventsFacade.selectedEvent$
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        filter((e): e is EventModelFullData => !!e),
        take(1),
        tap((event) =>
          this.modalFacade.open(TypeList.Events, TypeActionModal.Show, event)
        )
      )
      .subscribe();
  }

  onOpenMacroevent(macroId: number): void {
    this.macroeventsFacade
      .getMacroeventByIdOnce(macroId)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((macro) => {
        this.modalFacade.open(
          TypeList.Macroevents,
          TypeActionModal.Show,
          macro
        );
      });
  }

  onBackModal(): void {
    this.modalFacade.back();
  }

  onCloseModal(): void {
    this.modalFacade.close();
    this.item = null;
  }

  // ── CRUD
  onDelete({ type, id, item }: { type: TypeList; id: number; item?: any }) {
    if (type === TypeList.Events) {
      const periodicId = this.isEvent(item) ? item.periodic_id : null;

      if (periodicId) {
        this.eventsFacade
          .deleteEventsByPeriodicIdExcept(periodicId, id)
          .pipe(
            takeUntilDestroyed(this.destroyRef),
            tap(() =>
              this.filterSelected(
                String(this.selectedFilter ?? this.lastYearSelected)
              )
            )
          )
          .subscribe();
      } else {
        this.eventsFacade.deleteEvent(id);
      }
    }
  }

  isEvent(item: unknown): item is EventModelFullData {
    return !!item && typeof item === 'object' && 'periodic_id' in (item as any);
  }

  sendFormEvent(event: { itemId: number; formData: FormData }): void {
    const currentItem = this.item;
    const newPeriodicId = event.formData.get('periodic_id');
    const oldPeriodicId = this.isEvent(currentItem)
      ? currentItem?.periodic_id ?? null
      : null;

    const isRepeatedToUnique = !!oldPeriodicId && !newPeriodicId;

    const request$ = event.itemId
      ? this.eventsFacade.editEvent(event.formData)
      : this.eventsFacade.addEvent(event.formData);

    request$
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        switchMap(() =>
          isRepeatedToUnique && oldPeriodicId
            ? this.eventsFacade.deleteEventsByPeriodicIdExcept(
                oldPeriodicId,
                event.itemId
              )
            : of(null)
        ),
        finalize(() => this.onCloseModal())
      )
      .subscribe();
  }

  sendFormEventReport(event: { itemId: number; formData: FormData }): void {
    this.eventsReportsFacade
      .add(event.formData)
      .pipe(
        tap(() => {
          this.onCloseModal();
          this.filterSelected(
            String(this.selectedFilter ?? this.lastYearSelected)
          );
        })
      )
      .subscribe();
  }

  // ── Impresión
  async printTableAsPdf(): Promise<void> {
    if (!this.printArea) return;
    await this.pdfPrintService.printElementAsPdf(this.printArea, {
      filename: 'eventos.pdf',
      preset: 'compact',
      orientation: 'landscape',
      format: 'a4',
      margins: [5, 5, 5, 5],
    });
  }

  get eventsWithReportSet(): Set<number> {
    return new Set(this.eventIdsWithReportSig());
  }
}
