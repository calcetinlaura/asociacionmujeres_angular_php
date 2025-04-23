import { CommonModule } from '@angular/common';
import {
  Component,
  DestroyRef,
  inject,
  OnInit,
  QueryList,
  ViewChildren,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ReactiveFormsModule } from '@angular/forms';
import { MatTabChangeEvent, MatTabsModule } from '@angular/material/tabs';
import { tap } from 'rxjs';
import { SubsidiesFacade } from 'src/app/application/subsidies.facade';
import { ColumnModel } from 'src/app/core/interfaces/column.interface';
import { ProjectModelFullData } from 'src/app/core/interfaces/project.interface';
import {
  categoryFilterSubsidies,
  SubsidyModel,
  SubsidyModelFullData,
} from 'src/app/core/interfaces/subsidy.interface';
import {
  Filter,
  TypeActionModal,
  TypeList,
} from 'src/app/core/models/general.model';
import { SubsidiesService } from 'src/app/core/services/subsidies.services';
import { DashboardHeaderComponent } from 'src/app/modules/dashboard/components/dashboard-header/dashboard-header.component';
import { FiltersComponent } from 'src/app/modules/landing/components/filters/filters.component';
import { AddButtonComponent } from 'src/app/shared/components/buttons/button-add/button-add.component';
import { InputSearchComponent } from 'src/app/shared/components/inputs/input-search/input-search.component';
import { ModalComponent } from 'src/app/shared/components/modal/modal.component';
import { ModalService } from 'src/app/shared/components/modal/services/modal.service';
import { SpinnerLoadingComponent } from 'src/app/shared/components/spinner-loading/spinner-loading.component';
import { GeneralService } from 'src/app/shared/services/generalService.service';
import { TableComponent } from '../../components/table/table.component';
import { ModalShowSubsidyComponent } from './components/tab-subsidy/tab-subsidies.component';
@Component({
  selector: 'app-subsidies-page',
  standalone: true,
  imports: [
    CommonModule,
    DashboardHeaderComponent,
    ModalComponent,
    AddButtonComponent,
    ReactiveFormsModule,
    InputSearchComponent,
    FiltersComponent,
    MatTabsModule,
    SpinnerLoadingComponent,
    TableComponent,
    ModalShowSubsidyComponent,
  ],
  providers: [SubsidiesService],
  templateUrl: './subsidies-page.component.html',
  styleUrl: './subsidies-page.component.css',
})
export class SubsidiesPageComponent implements OnInit {
  private readonly destroyRef = inject(DestroyRef);
  private readonly modalService = inject(ModalService);
  private readonly subsidiesFacade = inject(SubsidiesFacade);
  private readonly subsidiesService = inject(SubsidiesService);
  private readonly generalService = inject(GeneralService);
  // ViewChildren
  @ViewChildren(ModalShowSubsidyComponent)
  tabSubsidies!: QueryList<ModalShowSubsidyComponent>;
  // UI & State
  typeList = TypeList;
  typeListModal: TypeList = TypeList.Subsidies;
  selectedFilter: number | null = null;
  currentModalAction: TypeActionModal = TypeActionModal.Create;
  subsidies: SubsidyModelFullData[] = [];
  filtersYears: Filter[] = [];
  filteredAllSubsidies: SubsidyModelFullData[] = [];
  filteredSubsidies: SubsidyModelFullData[] = [];
  showAllSubsidies = false;
  isActiveButtonList = false;
  selectedIndex: number = 0;
  selectedTypeFilter: string | null = null;
  currentFilterSubsidyType: string | null = null;
  currentTab: string | null = null;
  isLoading = false;
  // isLoadingFromFacade = false;
  number: number = 0;
  isModalVisible = false;
  item: any;
  currentYear = this.generalService.currentYear;
  headerListSubsidies: ColumnModel[] = [
    {
      title: 'Nombre',
      key: 'nameSubsidy',
      sortable: true,
      pipe: 'i18nSelect : nameSubsidy',
    },
    { title: 'Año', key: 'year', sortable: true, minWidth: true },
    {
      title: 'Fecha Max. Presentación',
      key: 'date_presentation',
      sortable: true,
      pipe: 'date : dd MMM yyyy',
      showIndicatorOnEmpty: true,
      minWidth: true,
    },
    {
      title: 'Fecha Max. Justificación',
      key: 'date_justification',
      sortable: true,
      pipe: 'date : dd MMM yyyy',
      minWidth: true,
      showIndicatorOnEmpty: true,
    },
    {
      title: 'Periodo',
      key: 'start',
      sortable: true,
      showIndicatorOnEmpty: true,
      minWidth: true,
    },
    {
      title: 'Proyectos',
      key: 'projects',
      sortable: true,
      minWidth: true,
      showLengthOnly: true,
    },
    {
      title: 'Facturas',
      key: 'invoices',
      sortable: true,
      minWidth: true,
      showLengthOnly: true,
    },
    {
      title: 'Link Bases',
      key: 'url_presentation',
      sortable: true,
      booleanIndicator: true,
      minWidth: true,
    },
    {
      title: 'Link Resolución',
      key: 'url_justification',
      sortable: true,
      booleanIndicator: true,
      minWidth: true,
    },
    {
      title: 'Cant. Solicitada',
      key: 'amount_requested',
      sortable: true,
      minWidth: true,
      pipe: 'eurosFormat',
      showIndicatorOnEmpty: true,
    },
    {
      title: 'Cant. Adjudicada',
      key: 'amount_granted',
      sortable: true,
      minWidth: true,
      pipe: 'eurosFormat',
      footerTotal: true,
      showIndicatorOnEmpty: true,
    },
    {
      title: 'Cant. Justificada',
      key: 'amount_justified',
      sortable: true,
      minWidth: true,
      pipe: 'eurosFormat',
      showIndicatorOnEmpty: true,
    },
    {
      title: 'Cant. Asociación',
      key: 'amount_association',
      sortable: true,
      minWidth: true,
      pipe: 'eurosFormat',
      footerTotal: true,
      showIndicatorOnEmpty: true,
    },
  ];

  filteredSubsidiesByType: { [key: string]: SubsidyModelFullData[] } =
    categoryFilterSubsidies.reduce((acc, filter) => {
      acc[filter.code] = [];
      return acc;
    }, {} as { [key: string]: SubsidyModelFullData[] });

  ngOnInit(): void {
    this.filtersYears = [
      { code: 'ALL', name: 'Histórico' },
      ...this.generalService.getYearFilters(2018, this.currentYear),
    ];

    this.modalService.modalVisibility$
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        tap((isVisible) => (this.isModalVisible = isVisible))
      )
      .subscribe();
    this.filterSelected('ALL');

    this.subsidiesFacade.filteredSubsidies$
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        tap((subsidies) => this.updateSubsidyState(subsidies))
      )
      .subscribe();
  }

  ngAfterViewInit(): void {
    this.tabSubsidies.changes
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((tabs: QueryList<ModalShowSubsidyComponent>) => {
        if (!this.showAllSubsidies && tabs.length > 0) {
          setTimeout(() => {
            tabs.first?.load();
          });
        }
      });
  }
  hasTabsToShow(): boolean {
    return Object.values(this.filteredSubsidiesByType).some(
      (subs) => subs.length > 0
    );
  }

  filterSelected(filter: string): void {
    this.selectedFilter = filter === 'ALL' ? null : Number(filter);

    if (filter === 'ALL') {
      this.showAllSubsidies = true;
      this.subsidiesFacade.setCurrentFilter(null);
      this.subsidiesFacade.loadAllSubsidies();
    } else {
      this.showAllSubsidies = false;
      this.subsidiesFacade.setCurrentFilter(Number(filter));
      this.subsidiesFacade.loadSubsidiesByYear(Number(filter));
    }
  }

  applyFilterWord(keyword: string): void {
    this.subsidiesFacade.applyFilterWord(keyword);
  }

  classifySubsidies(subsidies: SubsidyModelFullData[]): void {
    this.filteredSubsidiesByType = categoryFilterSubsidies.reduce(
      (acc, filter) => {
        acc[filter.code] = [];
        return acc;
      },
      {} as { [key: string]: SubsidyModelFullData[] }
    );

    subsidies.forEach((subsidy) => {
      const code = subsidy.name;
      if (this.filteredSubsidiesByType[code]) {
        this.filteredSubsidiesByType[code].push(subsidy);
      }
    });
  }

  tabActive(event: MatTabChangeEvent): void {
    this.selectedIndex = event.index;
    this.currentTab = event.tab?.textLabel || null;

    const selectedTab = this.tabSubsidies.toArray()[event.index];
    selectedTab?.load();
  }

  clearFilter(): void {
    this.currentFilterSubsidyType = null;
    this.filteredSubsidies = this.subsidies;
  }

  addNewSubsidyModal(): void {
    this.openModal(this.typeListModal, TypeActionModal.Create, null);
    // this.currentModalAction = TypeActionModal.Create;
    // this.item = null;
    // this.modalService.openModal();
  }

  onOpenModal(event: {
    type: TypeList;
    action: TypeActionModal;
    item: SubsidyModel | ProjectModelFullData;
  }): void {
    this.openModal(event.type, event.action, event.item ?? null);
  }

  private openModal(
    type: TypeList,
    action: TypeActionModal,
    item: SubsidyModel | ProjectModelFullData | null
  ): void {
    this.currentModalAction = action;
    this.typeListModal = type;
    this.item = item;
    this.modalService.openModal();
  }

  onCloseModal(): void {
    this.modalService.closeModal();
  }

  confirmDeleteSubsidy(subsidy: SubsidyModel | null): void {
    if (!subsidy || subsidy.id == null) return;
    this.subsidiesFacade.deleteSubsidy(subsidy.id);
    this.modalService.closeModal();
  }

  sendFormSubsidy(event: {
    itemId: number;
    newSubsidyData: SubsidyModel;
  }): void {
    const save$ = event.itemId
      ? this.subsidiesFacade.editSubsidy(event.itemId, event.newSubsidyData)
      : this.subsidiesFacade.addSubsidy(event.newSubsidyData);

    save$
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        tap(() => this.onCloseModal())
      )
      .subscribe();
  }

  private updateSubsidyState(subsidies: SubsidyModelFullData[] | null): void {
    if (!subsidies) return;

    const enrichedSubsidies = subsidies.map((sub) => ({
      ...sub,
      nameSubsidy: sub.name,
    }));

    this.subsidies =
      this.subsidiesService.sortSubsidiesByYear(enrichedSubsidies);
    this.filteredSubsidies = [...this.subsidies];
    this.number = this.subsidiesService.countSubsidies(enrichedSubsidies);

    // ✅ Clasifica por tipo para las pestañas
    this.classifySubsidies(this.subsidies);

    this.isLoading = false;
  }
}
