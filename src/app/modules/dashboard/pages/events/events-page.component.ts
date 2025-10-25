import { CommonModule } from '@angular/common';
import {
  Component,
  DestroyRef,
  ElementRef,
  OnInit,
  ViewChild,
  inject,
} from '@angular/core';
import { takeUntilDestroyed, toSignal } from '@angular/core/rxjs-interop';
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
import { MacroeventModelFullData } from 'src/app/core/interfaces/macroevent.interface';
import {
  Filter,
  TypeActionModal,
  TypeList,
} from 'src/app/core/models/general.model';
import { EventsService } from 'src/app/core/services/events.services';
import { MacroeventsService } from 'src/app/core/services/macroevents.services';

import { DashboardHeaderComponent } from 'src/app/shared/components/dashboard-header/dashboard-header.component';
import { FiltersComponent } from 'src/app/shared/components/filters/filters.component';
import { TableComponent } from 'src/app/shared/components/table/table.component';

import { GeneralService } from 'src/app/core/services/generalService.service';
import { PdfPrintService } from 'src/app/core/services/PdfPrintService.service';
import { SpinnerLoadingComponent } from 'src/app/shared/components/spinner-loading/spinner-loading.component';

import { PageToolbarComponent } from 'src/app/shared/components/page-toolbar/page-toolbar.component';
import { StickyZoneComponent } from 'src/app/shared/components/sticky-zone/sticky-zone.component';

// Hooks reutilizables
import { useColumnVisibility } from 'src/app/shared/hooks/use-column-visibility';
import { useEntityList } from 'src/app/shared/hooks/use-entity-list';

// Shell modal + navegación
import { ButtonFilterComponent } from 'src/app/shared/components/buttons/button-filter/button-filter.component';
import { ModalShellComponent } from 'src/app/shared/components/modal/modal-shell.component';
import { ModalNavService } from 'src/app/shared/components/modal/services/modal-nav.service';
import { ModalService } from 'src/app/shared/components/modal/services/modal.service';

@Component({
  selector: 'app-events-page',
  standalone: true,
  imports: [
    // UI
    DashboardHeaderComponent,
    SpinnerLoadingComponent,
    StickyZoneComponent,
    TableComponent,
    FiltersComponent,
    PageToolbarComponent,
    ModalShellComponent,
    // Angular
    CommonModule,
    ReactiveFormsModule,
    MatMenuModule,
    MatCheckboxModule,
    ButtonFilterComponent,
  ],
  templateUrl: './events-page.component.html',
})
export class EventsPageComponent implements OnInit {
  // ── Servicios
  private readonly destroyRef = inject(DestroyRef);
  private readonly modalService = inject(ModalService);
  private readonly eventsService = inject(EventsService);
  private readonly macroeventsService = inject(MacroeventsService);
  private readonly generalService = inject(GeneralService);
  private readonly pdfPrintService = inject(PdfPrintService);

  // Facade pública (para isListLoading$ en template si lo usas)
  readonly eventsFacade = inject(EventsFacade);
  private activeScope: 'all' | 'drafts' | 'scheduled' = 'all';
  // ── Columnas
  headerListEvents: ColumnModel[] = [
    { title: 'Cartel', key: 'img', sortable: false },
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
      key: 'espacioTable',
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

  // ── Column visibility (hook)
  readonly col = useColumnVisibility('events-table', this.headerListEvents, [
    'capacity',
    'organizer',
    'collaborator',
    'sponsor',
    'status',
    'summary',
    'published',
  ]);

  // ── Lista de entidades (hook) -> la facade controla visibleEvents$ según la carga
  readonly list = useEntityList<EventModelFullData>({
    filtered$: this.eventsFacade.visibleEvents$,
    sort: (arr) => this.eventsService.sortEventsById(arr),
    count: (arr) => this.eventsService.countEvents(arr),
    // map opcional para proyectar 'espacioTable'
    // map: (arr) => arr.map(e => ({ ...e, espacioTable: e?.place?.name ?? e?.space ?? '' }) as any),
    initial: [],
  });

  // ── Filtros
  filters: Filter[] = [];
  selectedFilter: string | number = '';
  currentYear = this.generalService.currentYear;
  private lastYearSelected = this.currentYear; // recordar el último año para drafts/scheduled

  // ── Modal
  readonly modalVisibleSig = toSignal(this.modalService.modalVisibility$, {
    initialValue: false,
  });
  item: EventModelFullData | MacroeventModelFullData | null = null;
  currentModalAction: TypeActionModal = TypeActionModal.Create;
  typeSection = TypeList.Events;
  typeModal = TypeList.Events;
  modalKey = 0;

  // Form
  searchForm!: FormGroup;

  // Refs
  @ViewChild('printArea', { static: false })
  printArea!: ElementRef<HTMLElement>;

  // Navegación modal (volver)
  private readonly modalNav = inject(
    ModalNavService<EventModelFullData | MacroeventModelFullData>
  );

  // ──────────────────────────────────────────────────────────────
  // Lifecycle
  // ──────────────────────────────────────────────────────────────
  ngOnInit(): void {
    // Filtros = años + extras "Borradores"/"Programados"
    const years = this.generalService.getYearFilters(2018, this.currentYear);
    this.filters = [...years];

    // Carga inicial: año actual, AGRUPADO y scope=all
    this.filterSelected(this.currentYear.toString());

    // Mantener viva la suscripción si hace falta
    this.eventsFacade.visibleEvents$
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe();
  }

  // ── Filtros / búsqueda
  filterSelected = (filter: string): void => {
    // Botones especiales siguen funcionando si te llega el string
    if (filter === 'drafts') {
      this.showDrafts();
      return;
    }
    if (filter === 'scheduled') {
      this.showScheduled();
      return;
    }

    // Filtro por año
    // Si es año → agrupado y TODOS los estados (published + drafts + scheduled)
    const year = Number(filter);
    if (!Number.isFinite(year)) return;

    this.selectedFilter = year;
    this.lastYearSelected = year;
    this.eventsFacade.applyFilterWord('');
    this.eventsFacade.loadDashboardAllGrouped(year);
  };
  showDrafts(): void {
    this.selectedFilter = 'drafts';
    this.activeScope = 'drafts';
    this.eventsFacade.applyFilterWord('');
    // ⬇️ Si quieres TODOS LOS AÑOS, usa el método “AllYears”:
    // this.eventsFacade.loadDashboardDraftsAllYears('groupedByPeriodicId');
    // ⬇️ Si prefieres el año actual/último seleccionado, deja esta línea:
    this.eventsFacade.loadDashboardDrafts(
      this.lastYearSelected,
      'groupedByPeriodicId'
    );
  }

  showScheduled(): void {
    this.selectedFilter = 'scheduled';
    this.activeScope = 'scheduled';
    this.eventsFacade.applyFilterWord('');
    // ⬇️ Todos los años:
    // this.eventsFacade.loadDashboardScheduledAllYears('groupedByPeriodicId');
    // ⬇️ Solo por año seleccionado:
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
    this.openModal(TypeList.Events, TypeActionModal.Create, null);
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
    item: EventModelFullData | MacroeventModelFullData | null
  ): void {
    this.currentModalAction = action;
    this.item = item;
    this.typeModal = typeModal;

    if (typeModal === TypeList.Events && action === TypeActionModal.Create) {
      this.eventsFacade.clearSelectedEvent();
    }
    this.modalKey++;
    this.modalService.openModal();
  }

  onOpenEvent = (eventId: number) => {
    // Guardar estado actual
    this.modalNav.push({
      typeModal: this.typeModal,
      action: this.currentModalAction,
      item: this.item,
    });

    this.eventsService
      .getEventById(eventId)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (ev: EventModelFullData) => {
          this.openModal(TypeList.Events, TypeActionModal.Show, ev);
        },
        error: (err) => console.error('Error cargando evento', err),
      });
  };

  onOpenMacroevent(macroId: number) {
    this.modalNav.push({
      typeModal: this.typeModal,
      action: this.currentModalAction,
      item: this.item,
    });

    this.macroeventsService
      .getMacroeventById(macroId)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (macro: MacroeventModelFullData) => {
          this.openModal(TypeList.Macroevents, TypeActionModal.Show, macro);
        },
        error: (err) => console.error('Error cargando macroevento', err),
      });
  }

  onBackModal(): void {
    const prev = this.modalNav.pop();
    if (!prev) return;
    this.currentModalAction = prev.action;
    this.item = prev.item;
    this.typeModal = prev.typeModal;
  }

  onCloseModal(): void {
    this.modalService.closeModal();
    this.item = null;
    this.modalNav.clear();
  }

  // ── CRUD (borrado por periodic_id si aplica)
  onDelete({ type, id, item }: { type: TypeList; id: number; item?: any }) {
    const actions: Partial<Record<TypeList, (id: number, item?: any) => void>> =
      {
        [TypeList.Events]: (x, it) => {
          const periodicId = this.isEvent(it) ? it.periodic_id : null;
          if (periodicId) {
            this.eventsService
              .deleteEventsByPeriodicId(periodicId)
              .pipe(
                takeUntilDestroyed(this.destroyRef),
                tap(() =>
                  // recargar con el filtro actual
                  this.filterSelected(
                    String(this.selectedFilter ?? this.lastYearSelected)
                  )
                )
              )
              .subscribe();
          } else {
            this.eventsFacade.deleteEvent(x);
          }
        },
      };

    actions[type]?.(id, item);
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
            ? this.eventsService.deleteOtherEventsByPeriodicId(
                oldPeriodicId,
                event.itemId
              )
            : of(null)
        ),
        finalize(() => this.onCloseModal())
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

  get canGoBack(): boolean {
    return this.modalNav.canGoBack() && !!this.item;
  }
}
