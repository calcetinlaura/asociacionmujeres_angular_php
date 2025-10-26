import { CommonModule } from '@angular/common';
import {
  afterNextRender,
  Component,
  computed,
  DestroyRef,
  ElementRef,
  inject,
  OnInit,
  Signal,
  ViewChild,
  WritableSignal,
} from '@angular/core';
import { takeUntilDestroyed, toSignal } from '@angular/core/rxjs-interop';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatMenuModule } from '@angular/material/menu';
import { map, tap } from 'rxjs';

import { MacroeventsFacade } from 'src/app/application/macroevents.facade';
import {
  ColumnModel,
  ColumnWidth,
} from 'src/app/core/interfaces/column.interface';
import { EventModelFullData } from 'src/app/core/interfaces/event.interface';
import { MacroeventModelFullData } from 'src/app/core/interfaces/macroevent.interface';
import { TypeActionModal, TypeList } from 'src/app/core/models/general.model';
import { EventsService } from 'src/app/core/services/events.services';
import { MacroeventsService } from 'src/app/core/services/macroevents.services';

import { GeneralService } from 'src/app/core/services/generalService.service';
import { PdfPrintService } from 'src/app/core/services/PdfPrintService.service';
import { DashboardHeaderComponent } from 'src/app/shared/components/dashboard-header/dashboard-header.component';
import { FiltersComponent } from 'src/app/shared/components/filters/filters.component';
import { ModalShellComponent } from 'src/app/shared/components/modal/modal-shell.component';
import { ModalNavService } from 'src/app/shared/components/modal/services/modal-nav.service';
import { ModalService } from 'src/app/shared/components/modal/services/modal.service';
import { SpinnerLoadingComponent } from 'src/app/shared/components/spinner-loading/spinner-loading.component';
import { StickyZoneComponent } from 'src/app/shared/components/sticky-zone/sticky-zone.component';
import { TableComponent } from 'src/app/shared/components/table/table.component';

// hooks reutilizables
import { Filter } from 'src/app/core/interfaces/general.interface';
import { PageToolbarComponent } from 'src/app/shared/components/page-toolbar/page-toolbar.component';
import { useColumnVisibility } from 'src/app/shared/hooks/use-column-visibility';
import { useEntityList } from 'src/app/shared/hooks/use-entity-list';

// toolbar común

@Component({
  selector: 'app-macroevents-page',
  standalone: true,
  imports: [
    // UI
    DashboardHeaderComponent,
    SpinnerLoadingComponent,
    StickyZoneComponent,
    TableComponent,
    FiltersComponent,
    ModalShellComponent,
    PageToolbarComponent,
    // Angular
    CommonModule,
    MatMenuModule,
    MatCheckboxModule,
  ],
  templateUrl: './macroevents-page.component.html',
})
export class MacroeventsPageComponent implements OnInit {
  private readonly destroyRef = inject(DestroyRef);
  private readonly modalService = inject(ModalService);
  private readonly pdfPrintService = inject(PdfPrintService);
  private readonly generalService = inject(GeneralService);

  readonly macroeventsFacade = inject(MacroeventsFacade);
  private readonly macroeventsService = inject(MacroeventsService);
  private readonly eventsService = inject(EventsService);
  private readonly modalNav = inject(
    ModalNavService<EventModelFullData | MacroeventModelFullData>
  );

  // Table columns
  headerListMacroevents: ColumnModel[] = [
    { title: 'Cartel', key: 'img', sortable: false },
    { title: 'Título', key: 'title', sortable: true },
    { title: 'Fecha', key: 'start', sortable: true, width: ColumnWidth.SM },
    { title: 'Eventos', key: 'events', sortable: true, showLengthOnly: true },
    {
      title: 'Descripción',
      key: 'description',
      sortable: true,
      showIndicatorOnEmpty: true,
      innerHTML: true,
      width: ColumnWidth.XL,
    },
    {
      title: 'Resumen',
      key: 'summary',
      sortable: true,
      booleanIndicator: true,
      width: ColumnWidth.XS,
    },
    {
      title: 'Municipio',
      key: 'town',
      showIndicatorOnEmpty: true,
      sortable: true,
      width: ColumnWidth.SM,
    },
  ];

  // ── Column visibility (hook)
  readonly col = useColumnVisibility(
    'macroevents-table',
    this.headerListMacroevents,
    ['town']
  );
  get columnVisSig(): WritableSignal<Record<string, boolean>> {
    return this.col.columnVisSig;
  }
  get displayedColumnsSig(): Signal<string[]> {
    return this.col.displayedColumnsSig;
  }

  // ── Entity list (hook): filtered → sort → count
  readonly list = useEntityList<MacroeventModelFullData>({
    filtered$: this.macroeventsFacade.filteredMacroevents$.pipe(
      map((v) => v ?? [])
    ),
    sort: (arr) => this.macroeventsService.sortMacroeventsById(arr),
    count: (arr) => this.macroeventsService.countMacroevents(arr),
  });

  // Modal
  readonly modalVisibleSig = toSignal(this.modalService.modalVisibility$, {
    initialValue: false,
  });
  typeModal: TypeList = TypeList.Macroevents;
  typeSection: TypeList = TypeList.Macroevents;
  item: MacroeventModelFullData | EventModelFullData | null = null;
  currentModalAction: TypeActionModal = TypeActionModal.Create;
  contentVersion = 0;
  // Filters
  filters: Filter[] = [];
  selectedFilter: number | null = null;
  readonly currentYear = this.generalService.currentYear;
  readonly canGoBackSig = computed(
    () => this.modalNav.canGoBack() && !!this.item
  );

  // Refs
  @ViewChild('printArea', { static: false })
  printArea!: ElementRef<HTMLElement>;

  constructor() {
    afterNextRender(() => {
      // cambia el estado tras el primer render → no hay NG0100
      this.filterSelected(String(this.currentYear));
    });
  }

  // ──────────────────────────────────────────────────────────────────────────────
  // Lifecycle
  // ──────────────────────────────────────────────────────────────────────────────

  ngOnInit(): void {
    this.filters = [
      { code: '', name: 'Histórico' },
      ...this.generalService.getYearFilters(2018, this.currentYear),
    ];
    // carga por defecto el año actual
    this.filterSelected(String(this.currentYear));
  }

  // ──────────────────────────────────────────────────────────────────────────────
  // Filtering / search
  // ──────────────────────────────────────────────────────────────────────────────
  filterSelected(filter: string): void {
    this.selectedFilter = filter === '' ? null : Number(filter);
    this.macroeventsFacade.applyFilterWord('');

    if (!filter) {
      this.macroeventsFacade.loadAllMacroevents();
    } else {
      this.macroeventsFacade.loadMacroeventsByYear(Number(filter));
    }
  }

  applyFilterWord(keyword: string): void {
    this.macroeventsFacade.applyFilterWord(keyword);
  }

  // ──────────────────────────────────────────────────────────────────────────────
  // Modal open/close + navigation
  // ──────────────────────────────────────────────────────────────────────────────
  addNewMacroeventModal(): void {
    this.openModal(TypeList.Macroevents, TypeActionModal.Create, null);
  }

  onOpenModal(payload: {
    typeModal: TypeList;
    action: TypeActionModal;
    item?: MacroeventModelFullData;
  }): void {
    const { typeModal, action, item } = payload;

    // ✅ Refetch antes de abrir en SHOW/EDIT
    if (
      typeModal === TypeList.Macroevents &&
      action !== TypeActionModal.Create &&
      item?.id
    ) {
      this.macroeventsService
        .getMacroeventById(item.id)
        .pipe(takeUntilDestroyed(this.destroyRef))
        .subscribe({
          next: (fresh) => {
            this.openModal(typeModal, action, fresh);
          },
          error: () => {
            this.openModal(typeModal, action, item);
          },
        });
      return;
    }

    this.openModal(typeModal, action, item ?? null);
  }

  private openModal(
    typeModal: TypeList,
    action: TypeActionModal,
    item: MacroeventModelFullData | EventModelFullData | null
  ): void {
    this.currentModalAction = action;
    this.item = item;
    this.typeModal = typeModal;
    this.contentVersion++; // 👈 fuerza re-render del contenido sin destruir la shell

    if (
      typeModal === TypeList.Macroevents &&
      action === TypeActionModal.Create
    ) {
      this.macroeventsFacade.clearSelectedMacroevent();
    }

    this.modalService.openModal();
  }

  onOpenEvent(eventId: number): void {
    // Guarda estado actual para "volver"
    this.modalNav.push({
      typeModal: this.typeModal,
      action: this.currentModalAction,
      item: this.item,
    });

    this.eventsService
      .getEventById(eventId)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (event: EventModelFullData) => {
          this.openModal(TypeList.Events, TypeActionModal.Show, event);
        },
        error: (err) => console.error('Error cargando evento', err),
      });
  }

  // Flecha "volver"
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

  // ──────────────────────────────────────────────────────────────────────────────
  // CRUD helpers
  // ──────────────────────────────────────────────────────────────────────────────
  onDelete({ type, id }: { type: TypeList; id: number }): void {
    const actions: Partial<Record<TypeList, (id: number) => void>> = {
      [TypeList.Macroevents]: (x) => this.macroeventsFacade.deleteMacroevent(x),
    };
    actions[type]?.(id);
  }

  sendFormMacroevent(payload: { itemId: number; formData: FormData }): void {
    const request$ = payload.itemId
      ? this.macroeventsFacade.editMacroevent(payload.formData)
      : this.macroeventsFacade.addMacroevent(payload.formData);

    request$
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        tap(() => this.onCloseModal())
      )
      .subscribe();
  }

  // ──────────────────────────────────────────────────────────────────────────────
  // Printing
  // ──────────────────────────────────────────────────────────────────────────────
  async printTableAsPdf(): Promise<void> {
    if (!this.printArea) return;

    await this.pdfPrintService.printElementAsPdf(this.printArea, {
      filename: 'macroeventos.pdf',
      preset: 'compact',
      orientation: 'portrait',
      format: 'a4',
      margins: [5, 5, 5, 5],
    });
  }

  get canGoBack(): boolean {
    return this.modalNav.canGoBack() && !!this.item;
  }
}
