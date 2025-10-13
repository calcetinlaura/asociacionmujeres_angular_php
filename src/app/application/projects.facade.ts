import { inject, Injectable } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { BehaviorSubject, catchError, finalize, Observable, tap } from 'rxjs';
import { ProjectModel } from 'src/app/core/interfaces/project.interface';
import { ProjectsService } from 'src/app/core/services/projects.services';
import { includesNormalized, toSearchKey } from '../shared/utils/text.utils';
import { LoadableFacade } from './loadable.facade';

@Injectable({ providedIn: 'root' })
export class ProjectsFacade extends LoadableFacade {
  private readonly projectsService = inject(ProjectsService);

  // State
  private readonly projectsSubject = new BehaviorSubject<ProjectModel[] | null>(
    null
  );
  private readonly filteredProjectsSubject = new BehaviorSubject<
    ProjectModel[] | null
  >(null);
  private readonly selectedProjectSubject =
    new BehaviorSubject<ProjectModel | null>(null);

  // Eventos
  private readonly savedSubject = new BehaviorSubject<ProjectModel | null>(
    null
  );
  private readonly deletedSubject = new BehaviorSubject<number | null>(null);

  // NEW: loaders separados
  private readonly listLoadingSubject = new BehaviorSubject<boolean>(false);
  private readonly itemLoadingSubject = new BehaviorSubject<boolean>(false);

  // Streams públicos
  readonly projects$ = this.projectsSubject.asObservable();
  readonly filteredProjects$ = this.filteredProjectsSubject.asObservable();
  readonly selectedProject$ = this.selectedProjectSubject.asObservable();
  readonly saved$ = this.savedSubject.asObservable();
  readonly deleted$ = this.deletedSubject.asObservable();

  // NEW: para la UI
  readonly isLoadingList$ = this.listLoadingSubject.asObservable();
  readonly isLoadingItem$ = this.itemLoadingSubject.asObservable();

  private currentFilter: number | null = null;

  // ───────── LISTA → isLoadingList$
  loadAllProjects(): void {
    this.setCurrentFilter(null);
    this.listLoadingSubject.next(true);
    this.projectsService
      .getProjects()
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        catchError((err) => this.generalService.handleHttpError(err)),
        finalize(() => this.listLoadingSubject.next(false))
      )
      .subscribe((projects) => this.updateProjectState(projects));
  }

  loadProjectsByYear(year: number): void {
    this.setCurrentFilter(year);
    this.listLoadingSubject.next(true);
    this.projectsService
      .getProjectsByYear(year)
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        catchError((err) => this.generalService.handleHttpError(err)),
        finalize(() => this.listLoadingSubject.next(false))
      )
      .subscribe((projects) => this.updateProjectState(projects));
  }

  // ───────── ITEM → isLoadingItem$
  loadProjectById(id: number): void {
    this.itemLoadingSubject.next(true);
    this.projectsService
      .getProjectById(id)
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        catchError((err) => this.generalService.handleHttpError(err)),
        finalize(() => this.itemLoadingSubject.next(false))
      )
      .subscribe((project) => this.selectedProjectSubject.next(project));
  }

  addProject(fd: FormData): Observable<ProjectModel> {
    this.itemLoadingSubject.next(true);
    return this.projectsService.add(fd).pipe(
      takeUntilDestroyed(this.destroyRef),
      tap((project) => {
        this.savedSubject.next(project);
        this.reloadCurrentFilter();
      }),
      catchError((err) => this.generalService.handleHttpError(err)),
      finalize(() => this.itemLoadingSubject.next(false))
    );
  }

  editProject(project: FormData): Observable<ProjectModel> {
    this.itemLoadingSubject.next(true);
    return this.projectsService.edit(project).pipe(
      takeUntilDestroyed(this.destroyRef),
      tap((p) => {
        this.savedSubject.next(p);
        this.reloadCurrentFilter();
      }),
      catchError((err) => this.generalService.handleHttpError(err)),
      finalize(() => this.itemLoadingSubject.next(false))
    );
  }

  deleteProject(id: number): void {
    this.itemLoadingSubject.next(true);
    this.projectsService
      .delete(id)
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        catchError((err) => this.generalService.handleHttpError(err)),
        finalize(() => this.itemLoadingSubject.next(false))
      )
      .subscribe(() => {
        this.deletedSubject.next(id);
        this.reloadCurrentFilter();
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
