import { inject, Injectable } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { BehaviorSubject, catchError, finalize, Observable, tap } from 'rxjs';
import { AgentModel } from '../core/interfaces/agent.interface';
import { AgentsService } from '../core/services/agents.services';
import { includesNormalized, toSearchKey } from '../shared/utils/text.utils';
import { LoadableFacade } from './loadable.facade';

@Injectable({ providedIn: 'root' })
export class AgentsFacade extends LoadableFacade {
  private readonly agentsService = inject(AgentsService);

  // State
  private readonly agentsSubject = new BehaviorSubject<AgentModel[] | null>(
    null
  );
  private readonly filteredAgentsSubject = new BehaviorSubject<
    AgentModel[] | null
  >(null);
  private readonly selectedAgentSubject =
    new BehaviorSubject<AgentModel | null>(null);

  // NEW: loaders separados
  private readonly listLoadingSubject = new BehaviorSubject<boolean>(false);
  private readonly itemLoadingSubject = new BehaviorSubject<boolean>(false);

  // Public streams
  readonly agents$ = this.agentsSubject.asObservable();
  readonly filteredAgents$ = this.filteredAgentsSubject.asObservable();
  readonly selectedAgent$ = this.selectedAgentSubject.asObservable();

  // NEW: para la UI
  readonly isLoadingList$ = this.listLoadingSubject.asObservable();
  readonly isLoadingItem$ = this.itemLoadingSubject.asObservable();

  // Último filtro aplicado (para recargar)
  private currentFilter: string | null = null;

  // ───────── LISTA → isLoadingList$
  loadAllAgents(): void {
    this.setCurrentFilter(null);
    this.listLoadingSubject.next(true);
    this.agentsService
      .getAgents()
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        catchError((err) => this.generalService.handleHttpError(err)),
        finalize(() => this.listLoadingSubject.next(false))
      )
      .subscribe((agents) => this.updateAgentState(agents));
  }

  loadAgentsByFilter(filter: string): void {
    this.setCurrentFilter(filter);
    this.listLoadingSubject.next(true);
    this.agentsService
      .getAgentsByCategory(filter)
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        catchError((err) => this.generalService.handleHttpError(err)),
        finalize(() => this.listLoadingSubject.next(false))
      )
      .subscribe((agents) => this.updateAgentState(agents));
  }

  // ───────── ITEM → isLoadingItem$
  loadAgentById(id: number): void {
    this.itemLoadingSubject.next(true);
    this.agentsService
      .getAgentById(id)
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        catchError((err) => this.generalService.handleHttpError(err)),
        finalize(() => this.itemLoadingSubject.next(false))
      )
      .subscribe((agent) => this.selectedAgentSubject.next(agent));
  }

  addAgent(agent: FormData): Observable<FormData> {
    this.itemLoadingSubject.next(true);
    return this.agentsService.add(agent).pipe(
      takeUntilDestroyed(this.destroyRef),
      tap(() => this.reloadCurrentFilter()),
      catchError((err) => this.generalService.handleHttpError(err)),
      finalize(() => this.itemLoadingSubject.next(false))
    );
  }

  editAgent(agent: FormData): Observable<FormData> {
    this.itemLoadingSubject.next(true);
    return this.agentsService.edit(agent).pipe(
      takeUntilDestroyed(this.destroyRef),
      tap(() => this.reloadCurrentFilter()),
      catchError((err) => this.generalService.handleHttpError(err)),
      finalize(() => this.itemLoadingSubject.next(false))
    );
  }

  deleteAgent(id: number): void {
    this.itemLoadingSubject.next(true);
    this.agentsService
      .delete(id)
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        catchError((err) => this.generalService.handleHttpError(err)),
        finalize(() => this.itemLoadingSubject.next(false))
      )
      .subscribe(() => this.reloadCurrentFilter());
  }

  clearSelectedAgent(): void {
    this.selectedAgentSubject.next(null);
  }

  applyFilterWord(keyword: string): void {
    const all = this.agentsSubject.getValue();
    if (!all) {
      this.filteredAgentsSubject.next(all);
      return;
    }
    if (!toSearchKey(keyword)) {
      this.filteredAgentsSubject.next(all);
      return;
    }

    const filtered = all.filter((b) =>
      [b.name].some((field) => includesNormalized(field, keyword))
    );
    this.filteredAgentsSubject.next(filtered);
  }

  setCurrentFilter(filter: string | null): void {
    this.currentFilter = filter;
  }

  private reloadCurrentFilter(): void {
    if (this.currentFilter === null) {
      this.loadAllAgents();
      return;
    }
    this.loadAgentsByFilter(this.currentFilter);
  }

  updateAgentState(agents: AgentModel[]): void {
    this.agentsSubject.next(agents);
    this.filteredAgentsSubject.next(agents);
  }
}
