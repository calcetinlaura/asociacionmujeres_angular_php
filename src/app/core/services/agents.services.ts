import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable, throwError } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { AgentModel } from 'src/app/core/interfaces/agent.interface';
import { environments } from 'src/environments/environments';

@Injectable({
  providedIn: 'root',
})
export class AgentsService {
  private apiUrl: string = `${environments.api}/backend/agents.php`;
  constructor(private http: HttpClient) {}

  getAgents(): Observable<any> {
    return this.http.get(this.apiUrl).pipe(catchError(this.handleError));
  }

  getAgentsByCategory(category: string): Observable<any> {
    return this.http
      .get(this.apiUrl, { params: { category: category } })
      .pipe(catchError(this.handleError));
  }

  getAgentById(id: number): Observable<any> {
    return this.http
      .get(this.apiUrl, { params: { id: id } })
      .pipe(catchError(this.handleError));
  }

  add(agent: FormData): Observable<any> {
    return this.http
      .post(this.apiUrl, agent)
      .pipe(catchError(this.handleError));
  }

  edit(id: number, agent: FormData): Observable<any> {
    return this.http
      .post(this.apiUrl, agent)
      .pipe(catchError(this.handleError));
  }

  delete(id: number): Observable<any> {
    return this.http
      .delete(this.apiUrl, { params: { id: id } })
      .pipe(catchError(this.handleError));
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

  handleError(error: HttpErrorResponse) {
    let errorMessage = '';

    if (error.error instanceof ErrorEvent) {
      // Error del lado del cliente o red
      errorMessage = `Error del cliente o red: ${error.error.message}`;
    } else {
      // El backend retornó un código de error no exitoso
      errorMessage = `Código de error del servidor: ${error.status}\nMensaje: ${error.message}`;
    }

    console.error(errorMessage); // Para depuración

    // Aquí podrías devolver un mensaje amigable para el usuario, o simplemente retornar el error
    return throwError(
      () =>
        new Error(
          'Hubo un problema con la solicitud, inténtelo de nuevo más tarde.'
        )
    );
  }
}
