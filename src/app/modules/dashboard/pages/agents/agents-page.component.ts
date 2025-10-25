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
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatMenuModule } from '@angular/material/menu';
import { map, tap } from 'rxjs';

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
import { PdfPrintService } from 'src/app/core/services/PdfPrintService.service';
import { DashboardHeaderComponent } from 'src/app/shared/components/dashboard-header/dashboard-header.component';
import { FiltersComponent } from 'src/app/shared/components/filters/filters.component';
import { ModalShellComponent } from 'src/app/shared/components/modal/modal-shell.component';
import { ModalService } from 'src/app/shared/components/modal/services/modal.service';
import { PageToolbarComponent } from 'src/app/shared/components/page-toolbar/page-toolbar.component';
import { SpinnerLoadingComponent } from 'src/app/shared/components/spinner-loading/spinner-loading.component';
import { StickyZoneComponent } from 'src/app/shared/components/sticky-zone/sticky-zone.component';
import { TableComponent } from 'src/app/shared/components/table/table.component';
import { useColumnVisibility } from 'src/app/shared/hooks/use-column-visibility';
import { useEntityList } from 'src/app/shared/hooks/use-entity-list';

type ModalState = {
  typeModal: TypeList;
  action: TypeActionModal;
  item: AgentsModelFullData | EventModelFullData | null;
};

@Component({
  selector: 'app-agents-page',
  standalone: true,
  imports: [
    DashboardHeaderComponent,
    SpinnerLoadingComponent,
    StickyZoneComponent,
    TableComponent,
    FiltersComponent,
    ModalShellComponent,
    PageToolbarComponent,
    CommonModule,
    MatMenuModule,
    MatCheckboxModule,
  ],
  templateUrl: './agents-page.component.html',
})
export class AgentsPageComponent implements OnInit {
  private readonly destroyRef = inject(DestroyRef);
  private readonly modalService = inject(ModalService);
  private readonly agentsService = inject(AgentsService);
  private readonly pdfPrintService = inject(PdfPrintService);
  private readonly eventsService = inject(EventsService);
  // Facade
  readonly agentsFacade = inject(AgentsFacade);

  // Columnas
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
    {
      title: 'Municipio',
      key: 'town',
      showIndicatorOnEmpty: true,
      sortable: true,
      textAlign: 'center',
    },
    {
      title: 'Categoría',
      key: 'category',
      sortable: true,
      width: ColumnWidth.MD,
      pipe: 'filterTransformCode',
      pipeArg: 'categoryAgents',
    },
  ];

  // ── Column visibility (hook)
  readonly col = useColumnVisibility('agents-table', this.headerListAgents);

  readonly list = useEntityList<AgentsModelFullData>({
    filtered$: this.agentsFacade.filteredAgents$.pipe(map((v) => v ?? [])),
    sort: (arr) => this.agentsService.sortAgentsById(arr),
    count: (arr) => this.agentsService.countAgents(arr),
  });

  // Filtros
  filters: Filter[] = [];
  selectedFilter: string | null = null;

  // Modal
  readonly modalVisibleSig = toSignal(this.modalService.modalVisibility$, {
    initialValue: false,
  });
  item: AgentsModelFullData | EventModelFullData | null = null;
  currentModalAction: TypeActionModal = TypeActionModal.Create;
  typeModal: TypeList = TypeList.Agents;
  typeSection: TypeList = TypeList.Agents;
  typeList = TypeList;

  // Historial navegación modal (Agente ↔ Evento)
  modalHistory: ModalState[] = [];

  @ViewChild('printArea', { static: false })
  printArea!: ElementRef<HTMLElement>;

  // ──────────────────────────────────────────────────────────────────────────────
  // Lifecycle
  // ──────────────────────────────────────────────────────────────────────────────
  ngOnInit(): void {
    // Filtros
    this.filters = [{ code: '', name: 'Todos' }, ...CategoryFilterAgents];

    // Carga inicial
    this.filterSelected('');
  }

  // ──────────────────────────────────────────────────────────────────────────────
  // Filtros / búsqueda
  // ──────────────────────────────────────────────────────────────────────────────
  filterSelected(filter: string): void {
    this.selectedFilter = filter;
    // Si usas InputSearchComponent en PageToolbar, no hay ref directa aquí;
    // limpia el filtro de texto invocando el método de la facade si procede (opcional).
    this.agentsFacade.applyFilterWord('');

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
    this.modalHistory = [];
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

  get canGoBack(): boolean {
    return this.modalHistory.length > 0;
  }
}
