import { CommonModule } from '@angular/common';
import {
  Component,
  DestroyRef,
  inject,
  OnInit,
  ViewChild,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormGroup, ReactiveFormsModule } from '@angular/forms';
import { tap } from 'rxjs';
import { AgentsFacade } from 'src/app/application/agents.facade';
import {
  AgentModel,
  categoryFilterAgents,
} from 'src/app/core/interfaces/agent.interface';
import { ColumnModel } from 'src/app/core/interfaces/column.interface';
import {
  Filter,
  TypeActionModal,
  TypeList,
} from 'src/app/core/models/general.model';
import { AgentsService } from 'src/app/core/services/agents.services';
import { DashboardHeaderComponent } from 'src/app/modules/dashboard/components/dashboard-header/dashboard-header.component';
import { TableComponent } from 'src/app/modules/dashboard/components/table/table.component';
import { FiltersComponent } from 'src/app/modules/landing/components/filters/filters.component';
import { AddButtonComponent } from 'src/app/shared/components/buttons/button-add/button-add.component';
import { InputSearchComponent } from 'src/app/shared/components/inputs/input-search/input-search.component';
import { ModalComponent } from 'src/app/shared/components/modal/modal.component';
import { ModalService } from 'src/app/shared/components/modal/services/modal.service';
import { SpinnerLoadingComponent } from 'src/app/shared/components/spinner-loading/spinner-loading.component';
import { GeneralService } from 'src/app/shared/services/generalService.service';

@Component({
  selector: 'app-agents-page',
  standalone: true,
  imports: [
    CommonModule,
    DashboardHeaderComponent,
    ModalComponent,
    AddButtonComponent,
    ReactiveFormsModule,
    InputSearchComponent,
    SpinnerLoadingComponent,
    TableComponent,
    FiltersComponent,
  ],
  templateUrl: './agents-page.component.html',
  styleUrl: './agents-page.component.css',
})
export class AgentsPageComponent implements OnInit {
  private readonly destroyRef = inject(DestroyRef);
  private readonly modalService = inject(ModalService);
  private readonly agentsFacade = inject(AgentsFacade);
  private readonly agentsService = inject(AgentsService);
  private readonly generalService = inject(GeneralService);

  agents: AgentModel[] = [];
  filteredAgents: AgentModel[] = [];
  filters: Filter[] = [];
  selectedFilter: string | null = null;

  isLoading = true;
  isModalVisible = false;
  number = 0;

  item: AgentModel | null = null;
  currentModalAction: TypeActionModal = TypeActionModal.Create;
  searchForm!: FormGroup;
  typeList = TypeList.Agents;

  headerListAgents: ColumnModel[] = [
    { title: 'Imagen', key: 'img' },
    { title: 'Nombre', key: 'name' },
    { title: 'Contacto', key: 'contact' },
    { title: 'Teléfono', key: 'phone' },
    { title: 'Email', key: 'email' },
    { title: 'Municipio', key: 'town' },
    { title: 'Categoría', key: 'category' },
  ];

  @ViewChild(InputSearchComponent)
  private inputSearchComponent!: InputSearchComponent;

  ngOnInit(): void {
    this.filters = [{ code: 'TODOS', name: 'Todos' }, ...categoryFilterAgents];

    this.modalService.modalVisibility$
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        tap((isVisible) => (this.isModalVisible = isVisible))
      )
      .subscribe();

    this.filterSelected('TODOS');

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
    this.agentsFacade.setCurrentFilter(filter);
  }

  applyFilterWord(keyword: string): void {
    this.agentsFacade.applyFilterWord(keyword);
  }

  addNewAgentModal(): void {
    this.openModal(TypeActionModal.Create, null);
  }

  onOpenModal(event: { action: TypeActionModal; item: AgentModel }): void {
    this.openModal(event.action, event.item);
  }

  private openModal(action: TypeActionModal, item: AgentModel | null): void {
    this.currentModalAction = action;
    this.item = item;
    this.modalService.openModal();
  }

  onCloseModal(): void {
    this.modalService.closeModal();
  }

  confirmDeleteAgent(agent: AgentModel | null): void {
    if (!agent) return;
    this.agentsFacade.deleteAgent(agent.id);
    this.onCloseModal();
  }

  sendFormAgent(event: { itemId: number; newAgentData: FormData }): void {
    const request$ = event.itemId
      ? this.agentsFacade.editAgent(event.itemId, event.newAgentData)
      : this.agentsFacade.addAgent(event.newAgentData);

    request$
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        tap(() => this.onCloseModal())
      )
      .subscribe();
  }

  private updateAgentState(agents: AgentModel[] | null): void {
    if (!agents) return;

    this.agents = this.agentsService.sortAgentsById(agents);
    this.filteredAgents = [...this.agents];
    this.number = this.agentsService.countAgents(agents);
    this.isLoading = false;
  }
}
