import { DestroyRef, inject, Injectable } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { BehaviorSubject, catchError, Observable, tap } from 'rxjs';
import { AgentModel } from '../core/interfaces/agent.interface';
import { AgentsService } from '../core/services/agents.services';
import { GeneralService } from '../shared/services/generalService.service';

@Injectable({
  providedIn: 'root',
})
export class AgentsFacade {
  private readonly destroyRef = inject(DestroyRef);
  private readonly agentsService = inject(AgentsService);
  private readonly generalService = inject(GeneralService);
  private readonly agentsSubject = new BehaviorSubject<AgentModel[] | null>(
    null
  );
  private readonly filteredAgentsSubject = new BehaviorSubject<
    AgentModel[] | null
  >(null);
  private readonly selectedAgentSubject =
    new BehaviorSubject<AgentModel | null>(null);

  agents$ = this.agentsSubject.asObservable();
  filteredAgents$ = this.filteredAgentsSubject.asObservable();
  selectedAgent$ = this.selectedAgentSubject.asObservable();
  currentFilter: string = 'ALL';

  constructor() {}

  setCurrentFilter(filter: string): void {
    this.currentFilter = filter;
    this.loadAgentsByFilter(filter);
  }

  loadAgentsByFilter(filter: string): void {
    const loaders: Record<string, () => void> = {
      ALL: () => this.loadAllAgents(),
    };

    (loaders[filter] || (() => this.loadAgentsByCategory(filter)))();
  }

  private reloadCurrentFilter(): void {
    this.loadAgentsByFilter(this.currentFilter);
  }

  loadAllAgents(): void {
    this.agentsService
      .getAgents()
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        tap((agents) => this.updateAgentState(agents)),
        catchError((err) => this.generalService.handleHttpError(err))
      )
      .subscribe();
  }

  loadAgentsByCategory(category: string): void {
    this.agentsService
      .getAgentsByCategory(category)
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        tap((agents) => this.updateAgentState(agents)),
        catchError((err) => this.generalService.handleHttpError(err))
      )
      .subscribe();
  }

  loadAgentById(id: number): void {
    this.agentsService
      .getAgentById(id)
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        tap((agent) => this.selectedAgentSubject.next(agent)),
        catchError((err) => this.generalService.handleHttpError(err))
      )
      .subscribe();
  }

  addAgent(agent: FormData): Observable<FormData> {
    return this.agentsService.add(agent).pipe(
      takeUntilDestroyed(this.destroyRef),
      tap(() => this.reloadCurrentFilter()),
      catchError((err) => this.generalService.handleHttpError(err))
    );
  }

  editAgent(id: number, agent: FormData): Observable<FormData> {
    return this.agentsService.edit(id, agent).pipe(
      takeUntilDestroyed(this.destroyRef),
      tap(() => this.reloadCurrentFilter()),
      catchError((err) => this.generalService.handleHttpError(err))
    );
  }

  deleteAgent(id: number): void {
    this.agentsService
      .delete(id)
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        tap(() => this.reloadCurrentFilter()),
        catchError((err) => this.generalService.handleHttpError(err))
      )
      .subscribe();
  }

  clearSelectedAgent(): void {
    this.selectedAgentSubject.next(null);
  }

  applyFilterWord(keyword: string): void {
    const allAgents = this.agentsSubject.getValue();

    if (!keyword.trim() || !allAgents) {
      this.filteredAgentsSubject.next(allAgents ?? []);
      return;
    }
    const search = keyword.trim().toLowerCase();
    const filtered = allAgents.filter(
      (agent) =>
        agent.name.toLowerCase().includes(search) ||
        (agent.contact && agent.contact.toLowerCase().includes(search))
    );

    this.filteredAgentsSubject.next(filtered);
  }

  updateAgentState(agents: AgentModel[]): void {
    this.agentsSubject.next(agents);
    this.filteredAgentsSubject.next(agents);
  }
}
