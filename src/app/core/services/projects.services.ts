import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { GeneralService } from 'src/app/shared/services/generalService.service';
import { environments } from 'src/environments/environments';
import { ProjectModel } from '../interfaces/project.interface';

@Injectable({
  providedIn: 'root',
})
export class ProjectsService {
  private readonly generalService = inject(GeneralService);
  private apiUrl: string = `${environments.api}/backend/projects.php`;
  constructor(private http: HttpClient) {}

  getProjects(): Observable<any> {
    return this.http
      .get(this.apiUrl)
      .pipe(catchError((err) => this.generalService.handleHttpError(err)));
  }
  getProjectsByYear(year: number): Observable<any> {
    return this.http
      .get(this.apiUrl, { params: { year: year } })
      .pipe(catchError((err) => this.generalService.handleHttpError(err)));
  }

  getProjectById(id: number): Observable<any> {
    return this.http
      .get(`${this.apiUrl}/${id}`)
      .pipe(catchError((err) => this.generalService.handleHttpError(err)));
  }

  add(event: FormData): Observable<any> {
    return this.http
      .post(this.apiUrl, event)
      .pipe(catchError((err) => this.generalService.handleHttpError(err)));
  }

  edit(id: number, event: FormData): Observable<any> {
    return this.http
      .post(this.apiUrl, event)
      .pipe(catchError((err) => this.generalService.handleHttpError(err)));
  }

  delete(id: number): Observable<any> {
    return this.http
      .delete(this.apiUrl, { params: { id: id } })
      .pipe(catchError((err) => this.generalService.handleHttpError(err)));
  }

  sortProjectsByTitle(projects: ProjectModel[]): ProjectModel[] {
    return projects.sort((a, b) =>
      a.title.toLowerCase().localeCompare(b.title.toLowerCase())
    );
  }

  sortProjectsById(projects: ProjectModel[]): ProjectModel[] {
    return projects.sort((a, b) => b.id - a.id);
  }

  hasResults(projects: ProjectModel[] | null): boolean {
    return !!projects && projects.length > 0;
  }

  countProjects(projects: ProjectModel[] | null): number {
    return projects?.length ?? 0;
  }
}
