import { CommonModule } from '@angular/common';
import {
  Component,
  DestroyRef,
  ElementRef,
  inject,
  OnInit,
  ViewChild,
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
import { ModalComponent } from 'src/app/shared/components/modal/modal.component';
import { ModalService } from 'src/app/shared/components/modal/services/modal.service';
import { SpinnerLoadingComponent } from 'src/app/shared/components/spinner-loading/spinner-loading.component';
import { GeneralService } from 'src/app/shared/services/generalService.service';
import { PdfPrintService } from 'src/app/shared/services/PdfPrintService.service';
import { StickyZoneComponent } from '../../components/sticky-zone/sticky-zone.component';
import { ColumnMenuComponent } from '../../components/table/column-menu.component';

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
    ModalComponent,
    ButtonIconComponent,
    ReactiveFormsModule,
    InputSearchComponent,
    SpinnerLoadingComponent,
    TableComponent,
    FiltersComponent,
    MatMenuModule,
    MatCheckboxModule,
    IconActionComponent,
    CommonModule,
    StickyZoneComponent,
    ColumnMenuComponent,
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

  modalHistory: ModalState[] = [];
  columnVisibility: Record<string, boolean> = {};
  displayedColumns: string[] = [];
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

  agents: AgentsModelFullData[] = [];
  filteredAgents: AgentsModelFullData[] = [];
  filters: Filter[] = [];
  selectedFilter: string | null = null;

  isModalVisible = false;
  number = 0;

  item: AgentsModelFullData | EventModelFullData | null = null;
  currentModalAction: TypeActionModal = TypeActionModal.Create;
  searchForm!: FormGroup;

  typeModal = TypeList.Agents;
  typeSection = TypeList.Agents;
  typeList = TypeList;

  @ViewChild(InputSearchComponent)
  private inputSearchComponent!: InputSearchComponent;

  @ViewChild('printArea', { static: false })
  printArea!: ElementRef<HTMLElement>;

  ngOnInit(): void {
    // Columnas visibles iniciales
    this.columnVisibility = this.generalService.setColumnVisibility(
      this.headerListAgents,
      [''] // Coloca las columnas que deseas ocultar aquí
    );

    // Actualiza las columnas visibles según el estado de visibilidad
    this.displayedColumns = this.generalService.updateDisplayedColumns(
      this.headerListAgents,
      this.columnVisibility
    );
    this.filters = [{ code: '', name: 'Todos' }, ...CategoryFilterAgents];

    this.modalService.modalVisibility$
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        tap((isVisible) => (this.isModalVisible = isVisible))
      )
      .subscribe();

    this.filterSelected('');

    this.agentsFacade.filteredAgents$
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        tap((agents) => this.updateAgentState(agents))
      )
      .subscribe();
  }

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
    this.typeModal = typeModal; // 🔑 primero el tipo
    this.currentModalAction = action;
    this.item = item;
    if (typeModal === TypeList.Agents && action === TypeActionModal.Create) {
      this.agentsFacade.clearSelectedAgent();
    }
    this.modalService.openModal();
  }

  onCloseModal(): void {
    this.modalService.closeModal();
    this.item = null;
    this.modalHistory = [];
  }

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

  private updateAgentState(agents: AgentsModelFullData[] | null): void {
    if (!agents) return;

    this.agents = this.agentsService.sortAgentsById(agents);
    this.filteredAgents = [...this.agents];
    this.number = this.agentsService.countAgents(agents);
  }

  async printTableAsPdf(): Promise<void> {
    if (!this.printArea) return;

    await this.pdfPrintService.printElementAsPdf(this.printArea, {
      filename: 'agentes.pdf',
      preset: 'compact', // 'compact' reduce paddings en celdas
      orientation: 'portrait', // o 'landscape' si la tabla es muy ancha
      format: 'a4',
      margins: [5, 5, 5, 5], // mm
    });
  }

  getVisibleColumns() {
    return this.headerListAgents.filter(
      (col) => this.columnVisibility[col.key]
    );
  }

  // Método para actualizar las columnas visibles cuando se hace toggle
  toggleColumn(key: string): void {
    this.columnVisibility[key] = !this.columnVisibility[key];
    this.displayedColumns = this.generalService.updateDisplayedColumns(
      this.headerListAgents,
      this.columnVisibility
    );
  }
  onOpenEvent(eventId: number) {
    // Guardar el estado actual ANTES de cambiar
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
          // Cambiar el contenido de la modal PERO mantenerla abierta
          this.openModal(TypeList.Events, TypeActionModal.Show, event);
        },
        error: (err) => console.error('Error cargando evento', err),
      });
  }
  onBackModal(): void {
    const prev = this.modalHistory.pop();
    if (!prev) return;

    // Reaplica el estado anterior sin cerrar la modal
    this.currentModalAction = prev.action;
    this.item = prev.item;
    this.typeModal = prev.typeModal;
  }
}
