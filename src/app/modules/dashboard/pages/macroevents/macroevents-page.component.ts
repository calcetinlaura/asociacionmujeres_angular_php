import { CommonModule } from '@angular/common';
import {
  Component,
  DestroyRef,
  ElementRef,
  OnInit,
  Signal,
  ViewChild,
  WritableSignal,
  computed,
  inject,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormGroup, ReactiveFormsModule } from '@angular/forms';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatMenuModule } from '@angular/material/menu';
import { tap } from 'rxjs';

import { MacroeventsFacade } from 'src/app/application/macroevents.facade';
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

import { DashboardHeaderComponent } from 'src/app/modules/dashboard/components/dashboard-header/dashboard-header.component';
import { TableComponent } from 'src/app/modules/dashboard/components/table/table.component';
import { FiltersComponent } from 'src/app/modules/landing/components/filters/filters.component';
import { ButtonIconComponent } from 'src/app/shared/components/buttons/button-icon/button-icon.component';
import { IconActionComponent } from 'src/app/shared/components/buttons/icon-action/icon-action.component';
import { InputSearchComponent } from 'src/app/shared/components/inputs/input-search/input-search.component';
import { SpinnerLoadingComponent } from 'src/app/shared/components/spinner-loading/spinner-loading.component';
import { GeneralService } from 'src/app/shared/services/generalService.service';
import { PdfPrintService } from 'src/app/shared/services/PdfPrintService.service';
import { StickyZoneComponent } from '../../components/sticky-zone/sticky-zone.component';
import { ColumnMenuComponent } from '../../components/table/column-menu.component';
import { ColumnVisibilityStore } from '../../components/table/column-visibility.store';

import { ModalShellComponent } from 'src/app/shared/components/modal/modal-shell.component';
import { ModalNavService } from 'src/app/shared/components/modal/services/modal-nav.service';
import { ModalService } from 'src/app/shared/components/modal/services/modal.service';

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
    ButtonIconComponent,
    IconActionComponent,
    InputSearchComponent,
    ColumnMenuComponent,
    ModalShellComponent,
    // Angular
    CommonModule,
    ReactiveFormsModule,
    MatMenuModule,
    MatCheckboxModule,
  ],
  templateUrl: './macroevents-page.component.html',
})
export class MacroeventsPageComponent implements OnInit {
  // Services / facades
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
  private readonly colStore = inject(ColumnVisibilityStore);

  // Table columns (definición)
  headerListMacroevents: ColumnModel[] = [
    { title: 'Cartel', key: 'img', sortable: false },
    { title: 'Título', key: 'title', sortable: true },
    { title: 'Fecha', key: 'start', sortable: true, width: ColumnWidth.SM },
    { title: 'Eventos', key: 'events', sortable: true },
    {
      title: 'Descripción',
      key: 'description',
      sortable: true,
      showIndicatorOnEmpty: true,
      innerHTML: true,
      width: ColumnWidth.XL,
    },
    { title: 'Municipio', key: 'town', sortable: true, width: ColumnWidth.SM },
  ];

  // ✅ Signals de columnas (persistentes)
  columnVisSig!: WritableSignal<Record<string, boolean>>;
  displayedColumnsSig!: Signal<string[]>;

  // Data
  macroevents: MacroeventModelFullData[] = [];
  filteredMacroevents: MacroeventModelFullData[] = [];
  number = 0;

  // Filters
  filters: Filter[] = [];
  selectedFilter: number | null = null;
  currentYear = this.generalService.currentYear;

  // Modal
  isModalVisible = false;
  typeModal: TypeList = TypeList.Macroevents;
  typeSection: TypeList = TypeList.Macroevents;
  item: MacroeventModelFullData | EventModelFullData | null = null;
  currentModalAction: TypeActionModal = TypeActionModal.Create;

  // Forms
  searchForm!: FormGroup;

  // Refs
  @ViewChild(InputSearchComponent)
  private inputSearchComponent!: InputSearchComponent;

  @ViewChild('printArea', { static: false })
  printArea!: ElementRef<HTMLElement>;

  // ──────────────────────────────────────────────────────────────────────────────
  // Lifecycle
  // ──────────────────────────────────────────────────────────────────────────────
  ngOnInit(): void {
    // Columnas visibles (persistentes por clave única)
    this.columnVisSig = this.colStore.init(
      'macroevents-table',
      this.headerListMacroevents,
      ['town'] // ocultas por defecto
    );
    this.displayedColumnsSig = computed(() =>
      this.colStore.displayedColumns(
        this.headerListMacroevents,
        this.columnVisSig()
      )
    );

    // Filtros de años (+ histórico)
    this.filters = [
      { code: '', name: 'Histórico' },
      ...this.generalService.getYearFilters(2018, this.currentYear),
    ];

    // Visibilidad modal
    this.modalService.modalVisibility$
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        tap((isVisible) => (this.isModalVisible = isVisible))
      )
      .subscribe();

    // Cargar por defecto el año actual
    this.filterSelected(this.currentYear.toString());

    // Estado desde fachada
    this.macroeventsFacade.filteredMacroevents$
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        tap((macroevents) => this.updateMacroeventState(macroevents))
      )
      .subscribe();
  }

  // ──────────────────────────────────────────────────────────────────────────────
  // Filtering / search
  // ──────────────────────────────────────────────────────────────────────────────
  filterSelected(filter: string): void {
    this.selectedFilter = filter === '' ? null : Number(filter);
    this.generalService.clearSearchInput(this.inputSearchComponent);

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
    this.openModal(payload.typeModal, payload.action, payload.item ?? null);
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

  private openModal(
    typeModal: TypeList,
    action: TypeActionModal,
    item: MacroeventModelFullData | EventModelFullData | null
  ): void {
    this.currentModalAction = action;
    this.item = item;
    this.typeModal = typeModal;

    // Limpiar seleccionado sólo en CREATE de macroeventos
    if (
      typeModal === TypeList.Macroevents &&
      action === TypeActionModal.Create
    ) {
      this.macroeventsFacade.clearSelectedMacroevent();
    }

    this.modalService.openModal();
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
    this.modalNav.clear(); // reset del stack al cerrar totalmente
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
  // Table helpers
  // ──────────────────────────────────────────────────────────────────────────────
  private updateMacroeventState(
    macroevents: MacroeventModelFullData[] | null
  ): void {
    if (!macroevents) return;

    this.macroevents = this.macroeventsService.sortMacroeventsById(macroevents);
    this.filteredMacroevents = [...this.macroevents];
    this.number = this.macroeventsService.countMacroevents(macroevents);
  }

  getVisibleColumns(): ColumnModel[] {
    return this.colStore.visibleColumnModels(
      this.headerListMacroevents,
      this.columnVisSig()
    );
  }

  toggleColumn(key: string): void {
    this.colStore.toggle('macroevents-table', this.columnVisSig, key);
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
      margins: [5, 5, 5, 5], // mm
    });
  }

  // Para el template
  get canGoBack(): boolean {
    return this.modalNav.canGoBack();
  }
}
