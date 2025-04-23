import { DestroyRef, inject, Injectable } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { BehaviorSubject, catchError, Observable, tap } from 'rxjs';
import { ProjectModel } from '../core/interfaces/project.interface';
import { ProjectsService } from '../core/services/projects.services';
import { GeneralService } from '../shared/services/generalService.service';

@Injectable({
  providedIn: 'root',
})
export class ProjectsFacade {
  private readonly destroyRef = inject(DestroyRef);
  private readonly projectsService = inject(ProjectsService);
  private readonly generalService = inject(GeneralService);
  private readonly projectsSubject = new BehaviorSubject<ProjectModel[] | null>(
    null
  );
  private readonly filteredProjectsSubject = new BehaviorSubject<
    ProjectModel[] | null
  >(null);
  private readonly selectedProjectSubject =
    new BehaviorSubject<ProjectModel | null>(null);

  projects$ = this.projectsSubject.asObservable();
  filteredProjects$ = this.filteredProjectsSubject.asObservable();
  selectedProject$ = this.selectedProjectSubject.asObservable();
  currentYear: number | null = null;
  currentFilter: number | null = null;

  constructor() {}

  setCurrentFilter(year: number | null): void {
    this.currentFilter = year;
  }
  setCurrentYear(year: number): void {
    this.currentYear = year;
  }
  private reloadCurrentFilteredYear(): void {
    if (this.currentFilter !== null) {
      this.loadProjectsByYear(this.currentFilter);
    } else {
      this.loadAllProjects();
    }
  }

  loadAllProjects(): void {
    this.projectsService
      .getProjects()
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        tap((projects) => {
          this.updateProjectState(projects);
        }),
        catchError((err) => this.generalService.handleHttpError(err))
      )
      .subscribe();
  }

  loadProjectsByYear(year: number): void {
    this.setCurrentFilter(year);

    this.projectsService
      .getProjectsByYear(year)
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        tap((projects: ProjectModel[]) => this.updateProjectState(projects)),
        catchError((err) => this.generalService.handleHttpError(err))
      )
      .subscribe();
  }

  loadProjectById(id: number): void {
    this.projectsService
      .getProjectById(id)
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        tap((event) => this.selectedProjectSubject.next(event)),
        catchError((err) => this.generalService.handleHttpError(err))
      )
      .subscribe();
  }

  editProject(itemId: number, event: FormData): Observable<FormData> {
    return this.projectsService.edit(itemId, event).pipe(
      takeUntilDestroyed(this.destroyRef),
      tap(() => this.reloadCurrentFilteredYear()),
      catchError((err) => this.generalService.handleHttpError(err))
    );
  }

  addProject(event: FormData): Observable<FormData> {
    return this.projectsService.add(event).pipe(
      takeUntilDestroyed(this.destroyRef),
      tap(() => this.reloadCurrentFilteredYear()),
      catchError((err) => this.generalService.handleHttpError(err))
    );
  }

  deleteProject(id: number): void {
    this.projectsService
      .delete(id)
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        tap(() => this.reloadCurrentFilteredYear()),
        catchError((err) => this.generalService.handleHttpError(err))
      )
      .subscribe();
  }

  clearSelectedProject(): void {
    this.selectedProjectSubject.next(null);
  }

  applyFilterWord(keyword: string): void {
    const allProjects = this.projectsSubject.getValue();

    if (!keyword.trim() || !allProjects) {
      this.filteredProjectsSubject.next(allProjects);
      return;
    }
    const search = keyword.trim().toLowerCase();

    const filteredProjects = allProjects.filter((event) =>
      event.title.toLowerCase().includes(search)
    );

    this.filteredProjectsSubject.next(filteredProjects);
  }

  private updateProjectState(projects: ProjectModel[]): void {
    this.projectsSubject.next(projects);
    this.filteredProjectsSubject.next(projects);
  }
}
