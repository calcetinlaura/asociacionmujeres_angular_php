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
import { ProjectsFacade } from 'src/app/application/projects.facade';
import { ColumnModel } from 'src/app/core/interfaces/column.interface';
import { ProjectModel } from 'src/app/core/interfaces/project.interface';
import {
  Filter,
  TypeActionModal,
  TypeList,
} from 'src/app/core/models/general.model';
import { ProjectsService } from 'src/app/core/services/projects.services';
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
  selector: 'app-projects-page',
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
  templateUrl: './projects-page.component.html',
  styleUrl: './projects-page.component.css',
})
export class ProjectsPageComponent implements OnInit {
  private readonly destroyRef = inject(DestroyRef);
  private readonly modalService = inject(ModalService);
  private readonly projectsFacade = inject(ProjectsFacade);
  private readonly projectsService = inject(ProjectsService);
  private readonly generalService = inject(GeneralService);

  projects: ProjectModel[] = [];
  filteredProjects: ProjectModel[] = [];
  filters: Filter[] = [];

  selectedFilter: number | null = null;
  currentYear = this.generalService.currentYear;
  typeList = TypeList.Projects;
  isLoading = true;
  isModalVisible = false;
  number = 0;

  item: ProjectModel | null = null;
  currentModalAction: TypeActionModal = TypeActionModal.Create;
  searchForm!: FormGroup;

  headerListProjects: ColumnModel[] = [
    { title: 'Título', key: 'title', sortable: true },
    { title: 'Año', key: 'year', sortable: true, minWidth: true },
    {
      title: 'Descripción',
      key: 'description',
      sortable: true,
      booleanIndicator: true,
      minWidth: true,
    },

    {
      title: 'Subvención',
      key: 'subsidy_name',
      sortable: true,
      minWidth: true,
    },
    {
      title: 'Actividades',
      key: 'activities',
      sortable: true,
    },
    { title: 'Eventos', key: 'events', sortable: true },
    { title: 'Facturas', key: 'invoices', sortable: true },
  ];

  @ViewChild(InputSearchComponent)
  private inputSearchComponent!: InputSearchComponent;

  ngOnInit(): void {
    const prueba = new Intl.NumberFormat('es-ES', {
      style: 'currency',
      currency: 'EUR',
    }).format(1234567.89);

    console.log('Formato de prueba:', prueba);
    this.filters = [
      { code: 'ALL', name: 'Histórico' },
      ...this.generalService.getYearFilters(2018, this.currentYear),
    ];

    this.modalService.modalVisibility$
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        tap((isVisible) => (this.isModalVisible = isVisible))
      )
      .subscribe();

    this.filterSelected(this.currentYear.toString());

    this.projectsFacade.filteredProjects$
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        tap((projects) => this.updateProjectState(projects))
      )
      .subscribe();
  }

  filterSelected(filter: string): void {
    this.selectedFilter = filter === 'ALL' ? null : Number(filter);

    this.generalService.clearSearchInput(this.inputSearchComponent);

    if (filter === 'ALL') {
      this.projectsFacade.setCurrentFilter(null);
      this.projectsFacade.loadAllProjects();
    } else {
      this.projectsFacade.setCurrentFilter(Number(filter));
      this.projectsFacade.loadProjectsByYear(Number(filter));
    }
  }

  applyFilterWord(keyword: string): void {
    this.projectsFacade.applyFilterWord(keyword);
  }

  addNewProjectModal(): void {
    this.openModal(TypeActionModal.Create, null);
  }

  onOpenModal(project: { action: TypeActionModal; item?: ProjectModel }): void {
    this.openModal(project.action, project.item ?? null);
  }

  private openModal(action: TypeActionModal, item: ProjectModel | null): void {
    this.currentModalAction = action;
    this.item = item;
    this.modalService.openModal();
  }

  onCloseModal(): void {
    this.modalService.closeModal();
  }

  confirmDeleteProject(project: ProjectModel | null): void {
    if (!project) return;
    this.projectsFacade.deleteProject(project.id);
    this.onCloseModal();
  }

  sendFormProject(project: { itemId: number; formData: FormData }): void {
    const request$ = project.itemId
      ? this.projectsFacade.editProject(project.itemId, project.formData)
      : this.projectsFacade.addProject(project.formData);

    request$
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        tap(() => this.onCloseModal())
      )
      .subscribe();
  }

  private updateProjectState(projects: ProjectModel[] | null): void {
    if (!projects) return;

    this.projects = this.projectsService.sortProjectsById(projects);
    this.filteredProjects = [...this.projects];
    this.number = this.projectsService.countProjects(projects);
    this.isLoading = false;
  }
}
