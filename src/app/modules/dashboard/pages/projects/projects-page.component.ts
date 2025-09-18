import { CommonModule } from '@angular/common';
import {
  Component,
  DestroyRef,
  ElementRef,
  inject,
  OnInit,
  ViewChild,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormGroup, ReactiveFormsModule } from '@angular/forms';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatMenuModule } from '@angular/material/menu';
import { tap } from 'rxjs';
import { ProjectsFacade } from 'src/app/application/projects.facade';
import {
  ColumnModel,
  ColumnWidth,
} from 'src/app/core/interfaces/column.interface';
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
import { ButtonIconComponent } from 'src/app/shared/components/buttons/button-icon/button-icon.component';
import { ButtonComponent } from 'src/app/shared/components/buttons/button/button.component';
import { IconActionComponent } from 'src/app/shared/components/buttons/icon-action/icon-action.component';
import { InputSearchComponent } from 'src/app/shared/components/inputs/input-search/input-search.component';
import { ModalComponent } from 'src/app/shared/components/modal/modal.component';
import { ModalService } from 'src/app/shared/components/modal/services/modal.service';
import { SpinnerLoadingComponent } from 'src/app/shared/components/spinner-loading/spinner-loading.component';
import { GeneralService } from 'src/app/shared/services/generalService.service';
import { PdfPrintService } from 'src/app/shared/services/PdfPrintService.service';
import { StickyZoneComponent } from '../../components/sticky-zone/sticky-zone.component';

@Component({
  selector: 'app-projects-page',
  standalone: true,
  imports: [
    DashboardHeaderComponent,
    ModalComponent,
    ButtonIconComponent,
    ReactiveFormsModule,
    InputSearchComponent,
    SpinnerLoadingComponent,
    TableComponent,
    FiltersComponent,
    MatMenuModule,
    MatCheckboxModule,
    ButtonComponent,
    IconActionComponent,
    CommonModule,
    StickyZoneComponent,
  ],
  templateUrl: './projects-page.component.html',
})
export class ProjectsPageComponent implements OnInit {
  private readonly destroyRef = inject(DestroyRef);
  private readonly modalService = inject(ModalService);
  readonly projectsFacade = inject(ProjectsFacade);
  private readonly projectsService = inject(ProjectsService);
  private readonly generalService = inject(GeneralService);
  private readonly pdfPrintService = inject(PdfPrintService);

  columnVisibility: Record<string, boolean> = {};
  displayedColumns: string[] = [];

  headerListProjects: ColumnModel[] = [
    { title: 'Título', key: 'title', sortable: true },
    {
      title: 'Año',
      key: 'year',
      sortable: true,
      width: ColumnWidth.XS,
      textAlign: 'center',
    },
    {
      title: 'Descripción',
      key: 'description',
      sortable: true,
      innerHTML: true,
      showIndicatorOnEmpty: true,
      width: ColumnWidth.LG,
    },

    {
      title: 'Subvención',
      key: 'subsidy_name',
      sortable: true,
      width: ColumnWidth.SM,
    },
    {
      title: 'Tareas',
      key: 'activities',
      sortable: true,
      width: ColumnWidth.LG,
    },
    { title: 'Eventos', key: 'events', sortable: true, width: ColumnWidth.XL },
    {
      title: 'Facturas',
      key: 'invoices',
      sortable: true,
      width: ColumnWidth.LG,
    },
  ];

  projects: ProjectModel[] = [];
  filteredProjects: ProjectModel[] = [];
  filters: Filter[] = [];
  selectedFilter: number | null = null;

  isModalVisible = false;
  number = 0;

  item: ProjectModel | null = null;
  currentModalAction: TypeActionModal = TypeActionModal.Create;
  searchForm!: FormGroup;

  currentYear = this.generalService.currentYear;
  typeModal = TypeList.Projects;
  typeSection = TypeList.Projects;

  @ViewChild(InputSearchComponent)
  private inputSearchComponent!: InputSearchComponent;

  @ViewChild('printArea', { static: false })
  printArea!: ElementRef<HTMLElement>;

  ngOnInit(): void {
    // Columnas visibles iniciales
    this.columnVisibility = this.generalService.setColumnVisibility(
      this.headerListProjects,
      ['description'] // Coloca las columnas que deseas ocultar aquí
    );

    // Actualiza las columnas visibles según el estado de visibilidad
    this.displayedColumns = this.generalService.updateDisplayedColumns(
      this.headerListProjects,
      this.columnVisibility
    );

    this.filters = [
      { code: '', name: 'Histórico' },
      ...this.generalService.getYearFilters(2018, this.currentYear),
    ];

    this.modalService.modalVisibility$
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        tap((isVisible) => (this.isModalVisible = isVisible))
      )
      .subscribe();

    this.filterSelected(this.currentYear.toString());

    // Estado de proyectos desde la fachada
    this.projectsFacade.filteredProjects$
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        tap((projects) => this.updateProjectState(projects))
      )
      .subscribe();
  }

  filterSelected(filter: string): void {
    this.selectedFilter = filter === '' ? null : Number(filter);

    this.generalService.clearSearchInput(this.inputSearchComponent);

    if (filter === '') {
      this.projectsFacade.loadAllProjects();
    } else {
      this.projectsFacade.loadProjectsByYear(Number(filter));
    }
  }

  applyFilterWord(keyword: string): void {
    this.projectsFacade.applyFilterWord(keyword);
  }

  addNewProjectModal(): void {
    this.openModal(this.typeModal, TypeActionModal.Create, null);
  }

  onOpenModal(project: {
    typeModal: TypeList;
    action: TypeActionModal;
    item?: ProjectModel;
  }): void {
    this.openModal(project.typeModal, project.action, project.item ?? null);
  }

  private openModal(
    typeModal: TypeList,
    action: TypeActionModal,
    item: ProjectModel | null
  ): void {
    this.currentModalAction = action;
    this.typeModal = typeModal;
    this.item = item;

    this.projectsFacade.clearSelectedProject();
    this.modalService.openModal();
  }

  onCloseModal(): void {
    this.modalService.closeModal();
  }

  onDelete({ type, id }: { type: TypeList; id: number }) {
    const actions: Partial<Record<TypeList, (id: number) => void>> = {
      [TypeList.Projects]: (x) => this.projectsFacade.deleteProject(x),
    };
    actions[type]?.(id);
  }

  sendFormProject(project: { itemId: number; formData: FormData }): void {
    const request$ = project.itemId
      ? this.projectsFacade.editProject(project.formData)
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
  }

  async printTableAsPdf(): Promise<void> {
    if (!this.printArea) return;

    await this.pdfPrintService.printElementAsPdf(this.printArea, {
      filename: 'proyectos.pdf',
      preset: 'compact', // 'compact' reduce paddings en celdas
      orientation: 'landscape', // o 'landscape' si la tabla es muy ancha
      format: 'a4',
      margins: [5, 5, 5, 5], // mm
    });
  }

  getVisibleColumns() {
    return this.headerListProjects.filter(
      (col) => this.columnVisibility[col.key]
    );
  }

  // Método para actualizar las columnas visibles cuando se hace toggle
  toggleColumn(key: string): void {
    this.columnVisibility[key] = !this.columnVisibility[key];
    this.displayedColumns = this.generalService.updateDisplayedColumns(
      this.headerListProjects,
      this.columnVisibility
    );
  }
}
