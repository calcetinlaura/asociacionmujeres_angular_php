import { inject, Injectable } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import {
  BehaviorSubject,
  catchError,
  EMPTY,
  finalize,
  Observable,
  tap,
} from 'rxjs';
import { AgentModel } from '../core/interfaces/agent.interface';
import { AgentsService } from '../core/services/agents.services';
import { filterByKeyword } from '../shared/utils/facade.utils';
import { LoadableFacade } from './loadable.facade';

@Injectable({ providedIn: 'root' })
export class AgentsFacade extends LoadableFacade {
  private readonly agentsService = inject(AgentsService);

  // ───────── STATE ─────────
  private readonly agentsSubject = new BehaviorSubject<AgentModel[] | null>(
    null
  );
  private readonly filteredAgentsSubject = new BehaviorSubject<
    AgentModel[] | null
  >(null);
  private readonly selectedAgentSubject =
    new BehaviorSubject<AgentModel | null>(null);

  private readonly listLoadingSubject = new BehaviorSubject<boolean>(false);
  private readonly itemLoadingSubject = new BehaviorSubject<boolean>(false);

  // ───────── PUBLIC STREAMS ─────────
  readonly agents$ = this.agentsSubject.asObservable();
  readonly filteredAgents$ = this.filteredAgentsSubject.asObservable();
  readonly selectedAgent$ = this.selectedAgentSubject.asObservable();
  readonly isLoadingList$ = this.listLoadingSubject.asObservable();
  readonly isLoadingItem$ = this.itemLoadingSubject.asObservable();

  private currentFilter: string | null = null;

  // ───────── LISTA → isLoadingList$ ─────────
  loadAllAgents(): void {
    this.setCurrentFilter(null);
    this.listLoadingSubject.next(true);

    this.agentsService
      .getAgents()
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        tap((agents) => this.updateAgentState(agents)),
        catchError((err) => {
          this.generalService.handleHttpError(err);
          return EMPTY;
        }),
        finalize(() => this.listLoadingSubject.next(false))
      )
      .subscribe();
  }

  loadAgentsByFilter(filter: string): void {
    this.setCurrentFilter(filter);
    this.listLoadingSubject.next(true);

    this.agentsService
      .getAgentsByCategory(filter)
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        tap((agents) => this.updateAgentState(agents)),
        catchError((err) => {
          this.generalService.handleHttpError(err);
          return EMPTY;
        }),
        finalize(() => this.listLoadingSubject.next(false))
      )
      .subscribe();
  }

  // ───────── ITEM → isLoadingItem$ ─────────
  loadAgentById(id: number): void {
    this.itemLoadingSubject.next(true);

    this.agentsService
      .getAgentById(id)
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        tap((agent) => this.selectedAgentSubject.next(agent)),
        catchError((err) => {
          this.generalService.handleHttpError(err);
          return EMPTY;
        }),
        finalize(() => this.itemLoadingSubject.next(false))
      )
      .subscribe();
  }

  // ───────── CRUD ─────────
  addAgent(agent: FormData): Observable<FormData> {
    this.itemLoadingSubject.next(true);

    return this.agentsService.add(agent).pipe(
      takeUntilDestroyed(this.destroyRef),
      tap(() => this.reloadCurrentFilter()),
      catchError((err) => {
        this.generalService.handleHttpError(err);
        return EMPTY;
      }),
      finalize(() => this.itemLoadingSubject.next(false))
    );
  }

  editAgent(agent: FormData): Observable<FormData> {
    this.itemLoadingSubject.next(true);

    return this.agentsService.edit(agent).pipe(
      takeUntilDestroyed(this.destroyRef),
      tap(() => this.reloadCurrentFilter()),
      catchError((err) => {
        this.generalService.handleHttpError(err);
        return EMPTY;
      }),
      finalize(() => this.itemLoadingSubject.next(false))
    );
  }

  deleteAgent(id: number): void {
    this.itemLoadingSubject.next(true);

    this.agentsService
      .delete(id)
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        tap(() => this.reloadCurrentFilter()),
        catchError((err) => {
          this.generalService.handleHttpError(err);
          return EMPTY;
        }),
        finalize(() => this.itemLoadingSubject.next(false))
      )
      .subscribe();
  }

  // ───────── HELPERS ─────────
  clearSelectedAgent(): void {
    this.selectedAgentSubject.next(null);
  }

  applyFilterWord(keyword: string): void {
    const all = this.agentsSubject.getValue();
    this.filteredAgentsSubject.next(
      filterByKeyword(all, keyword, [(a) => a.name])
    );
  }

  setCurrentFilter(filter: string | null): void {
    this.currentFilter = filter;
  }

  private reloadCurrentFilter(): void {
    if (this.currentFilter === null) {
      this.loadAllAgents();
    } else {
      this.loadAgentsByFilter(this.currentFilter);
    }
  }

  private updateAgentState(agents: AgentModel[]): void {
    this.agentsSubject.next(agents);
    this.filteredAgentsSubject.next(agents);
  }
}
