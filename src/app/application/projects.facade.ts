import { inject, Injectable } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { BehaviorSubject, catchError, Observable, Subject, tap } from 'rxjs';
import { ProjectModel } from 'src/app/core/interfaces/project.interface';
import { ProjectsService } from 'src/app/core/services/projects.services';
import { includesNormalized, toSearchKey } from '../shared/utils/text.utils';
import { LoadableFacade } from './loadable.facade';

@Injectable({ providedIn: 'root' })
export class ProjectsFacade extends LoadableFacade {
  private readonly projectsService = inject(ProjectsService);

  // State propio
  private readonly projectsSubject = new BehaviorSubject<ProjectModel[] | null>(
    null
  );
  private readonly filteredProjectsSubject = new BehaviorSubject<
    ProjectModel[] | null
  >(null);
  private readonly selectedProjectSubject =
    new BehaviorSubject<ProjectModel | null>(null);

  // Eventos (para notificar guardados/eliminados)
  private readonly savedSubject = new Subject<ProjectModel>();
  private readonly deletedSubject = new Subject<number>();

  // Streams públicos
  readonly projects$ = this.projectsSubject.asObservable();
  readonly filteredProjects$ = this.filteredProjectsSubject.asObservable();
  readonly selectedProject$ = this.selectedProjectSubject.asObservable();
  readonly saved$ = this.savedSubject.asObservable();
  readonly deleted$ = this.deletedSubject.asObservable();

  private currentFilter: number | null = null;

  loadAllProjects(): void {
    this.setCurrentFilter(null);
    this.executeWithLoading(this.projectsService.getProjects(), (projects) =>
      this.updateProjectState(projects)
    );
  }

  loadProjectsByYear(year: number): void {
    this.setCurrentFilter(year);
    this.executeWithLoading(
      this.projectsService.getProjectsByYear(year),
      (projects) => this.updateProjectState(projects)
    );
  }

  loadProjectById(id: number): void {
    this.executeWithLoading(
      this.projectsService.getProjectById(id),
      (project) => this.selectedProjectSubject.next(project)
    );
  }

  addProject(fd: FormData): Observable<ProjectModel> {
    return this.wrapWithLoading(this.projectsService.add(fd)).pipe(
      takeUntilDestroyed(this.destroyRef),
      tap((project) => {
        this.savedSubject.next(project);
        this.reloadCurrentFilter();
      }),
      catchError((err) => this.generalService.handleHttpError(err))
    );
  }

  editProject(project: FormData): Observable<ProjectModel> {
    return this.wrapWithLoading(this.projectsService.edit(project)).pipe(
      takeUntilDestroyed(this.destroyRef),
      tap((project) => {
        this.savedSubject.next(project);
        this.reloadCurrentFilter();
      }),
      catchError((err) => this.generalService.handleHttpError(err))
    );
  }

  // deleteProject(id: number): Observable<number> {
  //   return this.wrapWithLoading(this.projectsService.delete(id)).pipe(
  //     takeUntilDestroyed(this.destroyRef),
  //     tap(() => {
  //       this.deletedSubject.next(id);
  //       this.reloadCurrentFilter();
  //     }),
  //     map(() => id),
  //     catchError((err) => this.generalService.handleHttpError(err))
  //   );
  // }
  deleteProject(id: number): void {
    this.executeWithLoading(this.projectsService.delete(id), () => {
      this.deletedSubject.next(id);
      this.reloadCurrentFilter(); // recarga la lista
    });
  }

  clearSelectedProject(): void {
    this.selectedProjectSubject.next(null);
  }

  applyFilterWord(keyword: string): void {
    const all = this.projectsSubject.getValue();

    if (!all) {
      this.filteredProjectsSubject.next(all);
      return;
    }

    if (!toSearchKey(keyword)) {
      this.filteredProjectsSubject.next(all);
      return;
    }

    const filtered = all.filter((p) =>
      [p.title].some((field) => includesNormalized(field, keyword))
    );

    this.filteredProjectsSubject.next(filtered);
  }

  setCurrentFilter(year: number | null): void {
    this.currentFilter = year;
  }

  private reloadCurrentFilter(): void {
    if (this.currentFilter === null) {
      this.loadAllProjects();
      return;
    }
    this.loadProjectsByYear(this.currentFilter);
  }

  private updateProjectState(projects: ProjectModel[]): void {
    this.projectsSubject.next(projects);
    this.filteredProjectsSubject.next(projects);
  }
}
