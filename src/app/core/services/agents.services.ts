import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { AgentModel } from 'src/app/core/interfaces/agent.interface';
import { GeneralService } from 'src/app/core/services/generalService.service';
import { environments } from 'src/environments/environments';

@Injectable({
  providedIn: 'root',
})
export class AgentsService {
  private readonly generalService = inject(GeneralService);
  private apiUrl: string = `${environments.api}/backend/agents.php`;
  constructor(private http: HttpClient) {}

  getAgents(): Observable<any> {
    return this.http
      .get(this.apiUrl)
      .pipe(catchError((err) => this.generalService.handleHttpError(err)));
  }

  getAgentsByCategory(category: string): Observable<any> {
    return this.http
      .get(this.apiUrl, { params: { category: category } })
      .pipe(catchError((err) => this.generalService.handleHttpError(err)));
  }

  getAgentById(id: number): Observable<any> {
    return this.http
      .get(this.apiUrl, { params: { id: id } })
      .pipe(catchError((err) => this.generalService.handleHttpError(err)));
  }

  add(agent: FormData): Observable<any> {
    return this.http
      .post(this.apiUrl, agent)
      .pipe(catchError((err) => this.generalService.handleHttpError(err)));
  }

  edit(agent: FormData): Observable<any> {
    return this.http
      .post(this.apiUrl, agent)
      .pipe(catchError((err) => this.generalService.handleHttpError(err)));
  }

  delete(id: number): Observable<any> {
    return this.generalService.deleteOverride<any>(this.apiUrl, { id });
  }

  sortAgentsByName(agents: AgentModel[]): AgentModel[] {
    return agents.sort((a, b) =>
      a.name.toLowerCase().localeCompare(b.name.toLowerCase(), undefined, {
        sensitivity: 'base',
      })
    );
  }

  sortAgentsById(agents: AgentModel[]): AgentModel[] {
    return agents.sort((a, b) => b.id - a.id);
  }

  hasResults(agents: AgentModel[] | null): boolean {
    return !!agents && agents.length > 0;
  }

  countAgents(agents: AgentModel[] | null): number {
    return agents?.length ?? 0;
  }
}
