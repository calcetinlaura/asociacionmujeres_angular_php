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

import { AgentsFacade } from 'src/app/application/agents.facade';
import {
  AgentsModelFullData,
  CategoryFilterAgents,
} from 'src/app/core/interfaces/agent.interface';
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
import { AgentsService } from 'src/app/core/services/agents.services';
import { EventsService } from 'src/app/core/services/events.services';

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

// Nuevo shell de modal unificado
import { ModalShellComponent } from 'src/app/shared/components/modal/modal-shell.component';
import { ModalService } from 'src/app/shared/components/modal/services/modal.service';

type ModalState = {
  typeModal: TypeList;
  action: TypeActionModal;
  item: AgentsModelFullData | EventModelFullData | null;
};

@Component({
  selector: 'app-agents-page',
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
  templateUrl: './agents-page.component.html',
})
export class AgentsPageComponent implements OnInit {
  private readonly destroyRef = inject(DestroyRef);
  private readonly modalService = inject(ModalService);
  readonly agentsFacade = inject(AgentsFacade);
  private readonly agentsService = inject(AgentsService);
  private readonly generalService = inject(GeneralService);
  private readonly pdfPrintService = inject(PdfPrintService);
  private readonly eventsService = inject(EventsService);
  private readonly colStore = inject(ColumnVisibilityStore);

  // Tabla: definición columnas
  headerListAgents: ColumnModel[] = [
    { title: 'Imagen', key: 'img', sortable: false },
    { title: 'Nombre', key: 'name', sortable: true },
    {
      title: 'Contacto',
      key: 'contact',
      sortable: true,
      showIndicatorOnEmpty: true,
    },
    {
      title: 'Teléfono',
      key: 'phone',
      sortable: true,
      showIndicatorOnEmpty: true,
      width: ColumnWidth.XS,
      pipe: 'phoneFormat',
      textAlign: 'center',
    },
    {
      title: 'Email',
      key: 'email',
      sortable: true,
      showIndicatorOnEmpty: true,
      width: ColumnWidth.LG,
    },
    { title: 'Municipio', key: 'town', sortable: true, textAlign: 'center' },
    {
      title: 'Categoría',
      key: 'category',
      sortable: true,
      width: ColumnWidth.MD,
      pipe: 'filterTransformCode',
      pipeArg: 'categoryAgents',
    },
  ];

  // ✅ Signals de columnas (persistentes)
  columnVisSig!: WritableSignal<Record<string, boolean>>;
  displayedColumnsSig!: Signal<string[]>;

  // Datos
  agents: AgentsModelFullData[] = [];
  filteredAgents: AgentsModelFullData[] = [];
  filters: Filter[] = [];
  selectedFilter: string | null = null;

  // Modal
  isModalVisible = false;
  number = 0;
  item: AgentsModelFullData | EventModelFullData | null = null;
  currentModalAction: TypeActionModal = TypeActionModal.Create;
  typeModal: TypeList = TypeList.Agents;
  typeSection: TypeList = TypeList.Agents;
  typeList = TypeList;

  // Historial navegación modal (Agente ↔ Evento)
  modalHistory: ModalState[] = [];

  // Form
  searchForm!: FormGroup;

  @ViewChild(InputSearchComponent)
  private inputSearchComponent!: InputSearchComponent;

  @ViewChild('printArea', { static: false })
  printArea!: ElementRef<HTMLElement>;

  ngOnInit(): void {
    // Columnas visibles persistentes
    this.columnVisSig = this.colStore.init(
      'agents-table',
      this.headerListAgents
    );
    this.displayedColumnsSig = computed(() =>
      this.colStore.displayedColumns(this.headerListAgents, this.columnVisSig())
    );

    // Filtros
    this.filters = [{ code: '', name: 'Todos' }, ...CategoryFilterAgents];

    // Estado visibilidad modal
    this.modalService.modalVisibility$
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        tap((v) => (this.isModalVisible = v))
      )
      .subscribe();

    // Carga inicial
    this.filterSelected('');

    // Estado de agentes
    this.agentsFacade.filteredAgents$
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        tap((agents) => this.updateAgentState(agents))
      )
      .subscribe();
  }

  // ──────────────────────────────────────────────────────────────────────────────
  // Filtros / búsqueda
  // ──────────────────────────────────────────────────────────────────────────────
  filterSelected(filter: string): void {
    this.selectedFilter = filter;
    this.generalService.clearSearchInput(this.inputSearchComponent);

    if (!filter) {
      this.agentsFacade.loadAllAgents();
    } else {
      this.agentsFacade.loadAgentsByFilter(filter);
    }
  }

  applyFilterWord(keyword: string): void {
    this.agentsFacade.applyFilterWord(keyword);
  }

  // ──────────────────────────────────────────────────────────────────────────────
  // Modal + navegación
  // ──────────────────────────────────────────────────────────────────────────────
  addNewAgentModal(): void {
    this.openModal(TypeList.Agents, TypeActionModal.Create, null);
  }

  onOpenModal(event: {
    typeModal: TypeList;
    action: TypeActionModal;
    item: AgentsModelFullData;
  }): void {
    this.openModal(event.typeModal, event.action, event.item);
  }

  openModal(typeModal: TypeList, action: TypeActionModal, item: any): void {
    this.typeModal = typeModal;
    this.currentModalAction = action;
    this.item = item;

    // Limpiar seleccionado SOLO en Create de Agentes
    if (typeModal === TypeList.Agents && action === TypeActionModal.Create) {
      this.agentsFacade.clearSelectedAgent();
    }

    this.modalService.openModal();
  }

  onOpenEvent(eventId: number) {
    // Guardar estado actual antes de navegar
    this.modalHistory.push({
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

  onBackModal(): void {
    const prev = this.modalHistory.pop();
    if (!prev) return;
    this.currentModalAction = prev.action;
    this.item = prev.item;
    this.typeModal = prev.typeModal;
  }

  onCloseModal(): void {
    this.modalService.closeModal();
    this.item = null;
    this.modalHistory = []; // reset del stack
  }

  // ──────────────────────────────────────────────────────────────────────────────
  // CRUD
  // ──────────────────────────────────────────────────────────────────────────────
  onDelete({ type, id }: { type: TypeList; id: number }) {
    const actions: Partial<Record<TypeList, (id: number) => void>> = {
      [TypeList.Agents]: (x) => this.agentsFacade.deleteAgent(x),
    };
    actions[type]?.(id);
  }

  sendFormAgent(event: { itemId: number; formData: FormData }): void {
    const request$ = event.itemId
      ? this.agentsFacade.editAgent(event.formData)
      : this.agentsFacade.addAgent(event.formData);

    request$
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        tap(() => this.onCloseModal())
      )
      .subscribe();
  }

  // ──────────────────────────────────────────────────────────────────────────────
  // Tabla helpers
  // ──────────────────────────────────────────────────────────────────────────────
  private updateAgentState(agents: AgentsModelFullData[] | null): void {
    if (!agents) return;
    this.agents = this.agentsService.sortAgentsById(agents);
    this.filteredAgents = [...this.agents];
    this.number = this.agentsService.countAgents(agents);
  }

  getVisibleColumns() {
    return this.colStore.visibleColumnModels(
      this.headerListAgents,
      this.columnVisSig()
    );
  }

  toggleColumn(key: string): void {
    this.colStore.toggle('agents-table', this.columnVisSig, key);
  }

  // ──────────────────────────────────────────────────────────────────────────────
  // Impresión
  // ──────────────────────────────────────────────────────────────────────────────
  async printTableAsPdf(): Promise<void> {
    if (!this.printArea) return;

    await this.pdfPrintService.printElementAsPdf(this.printArea, {
      filename: 'agentes.pdf',
      preset: 'compact',
      orientation: 'portrait',
      format: 'a4',
      margins: [5, 5, 5, 5],
    });
  }

  // Para el shell (si quieres condicionar mostrar flecha)
  get canGoBack(): boolean {
    return this.modalHistory.length > 0;
  }
}
