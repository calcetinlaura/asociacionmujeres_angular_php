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
import {
  categoryFilterSubsidies,
  SubsidyModel,
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
import { ModalShowSubsidyComponent } from './components/tab-subsidy/tab-subsidies.component';
import { TableSubsidyComponent } from './components/table-subsidies/table-subsidy.component';
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
    TableSubsidyComponent,
    FiltersComponent,
    MatTabsModule,
    ModalShowSubsidyComponent,
    SpinnerLoadingComponent,
  ],
  providers: [SubsidiesService],
  templateUrl: './subsidies-page.component.html',
  styleUrl: './subsidies-page.component.css',
})
export class SubsidiesPageComponent implements OnInit {
  // Injections
  private subsidiesFacade = inject(SubsidiesFacade);
  private modalService = inject(ModalService);
  private destroyRef = inject(DestroyRef);
  private generalService = inject(GeneralService);
  // ViewChildren
  @ViewChildren(ModalShowSubsidyComponent)
  tabSubsidies!: QueryList<ModalShowSubsidyComponent>;
  // UI & State
  typeList = TypeList;
  typeListModal: TypeList = TypeList.Subsidies;
  currentModalAction: TypeActionModal = TypeActionModal.Create;
  subsidies: SubsidyModel[] = [];
  filtersYears: Filter[] = [];
  filteredAllSubsidies: SubsidyModel[] = [];
  filteredSubsidies: SubsidyModel[] = [];
  showAllSubsidies: boolean = false;
  isActiveButtonList: boolean = false;
  selectedIndex: number = 0;
  selectedTypeFilter: string | null = null;
  currentFilterSubsidyType: string | null = null;
  currentTab: string | null = null;
  isLoading: boolean = false;
  isLoadingFromFacade = false;
  number: number = 0;
  isModalVisible: boolean = false;
  item: any;
  selectedFilter: number | null = null;
  currentYear = this.generalService.currentYear;

  filteredSubsidiesByType: { [key: string]: SubsidyModel[] } =
    categoryFilterSubsidies.reduce((acc, filter) => {
      acc[filter.code] = [];
      return acc;
    }, {} as { [key: string]: SubsidyModel[] });

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

    this.subsidiesFacade.isLoadingSubsidies$
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((loading) => (this.isLoadingFromFacade = loading));

    this.subsidiesFacade.filteredSubsidies$
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        tap((subsidies) => {
          this.subsidies = subsidies;
          this.filteredAllSubsidies = subsidies;
          this.number = subsidies.length;
          this.classifySubsidies(subsidies);
          this.isLoading = false;
        })
      )
      .subscribe();

    this.showAllSubsidies = true;
    this.subsidiesFacade.setCurrentFilter('TODOS');
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

  filterYearSelected(filter: string): void {
    if (filter === 'all') {
      this.selectedFilter = null;
      this.showAllSubsidies = true;

      // Si quieres guardar el texto del filtro activo:
      this.subsidiesFacade.setCurrentFilter('TODOS');

      this.subsidiesFacade.loadAllSubsidies(); // 👈 carga todos los datos

      this.subsidiesFacade.subsidies$
        .pipe(
          takeUntilDestroyed(this.destroyRef),
          tap((subs) => {
            this.filteredAllSubsidies = subs;
            this.classifySubsidies(subs);
            setTimeout(() => this.tabSubsidies.first?.load());
          })
        )
        .subscribe();
    } else {
      const year = Number(filter);
      if (!isNaN(year) && year > 0) {
        this.selectedFilter = year;
        this.showAllSubsidies = false;

        this.subsidiesFacade.setCurrentFilter(year.toString());

        this.subsidiesFacade.loadSubsidiesByYear(year);

        this.subsidiesFacade.subsidies$
          .pipe(
            takeUntilDestroyed(this.destroyRef),
            tap((subs) => {
              this.filteredAllSubsidies = subs;
              this.classifySubsidies(subs);
              setTimeout(() => this.tabSubsidies.first?.load());
            })
          )
          .subscribe();
      }
    }
  }

  classifySubsidies(subsidies: SubsidyModel[]): void {
    this.filteredSubsidiesByType = categoryFilterSubsidies.reduce(
      (acc, filter) => {
        acc[filter.code] = [];
        return acc;
      },
      {} as { [key: string]: SubsidyModel[] }
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
    selectedTab?.load(); // ⬅️ llama al método `load()` del tab activo
  }

  clearFilter(): void {
    this.currentFilterSubsidyType = null;
    this.filteredSubsidies = this.subsidies;
  }

  confirmDeleteSubsidy(item: any): void {
    this.subsidiesFacade.deleteSubsidy(item.id);
    this.modalService.closeModal();
  }

  addNewSubsidyModal(): void {
    this.currentModalAction = TypeActionModal.Create;
    this.item = null;
    this.modalService.openModal();
  }

  onOpenModal(event: {
    type: TypeList;
    action: TypeActionModal;
    item: any;
  }): void {
    this.typeListModal = event.type;
    this.currentModalAction = event.action;
    this.item = event.item;
    this.modalService.openModal();
  }

  onCloseModal(): void {
    this.modalService.closeModal();
  }

  sendFormSubsidy(event: {
    itemId: number;
    newSubsidyData: SubsidyModel;
  }): void {
    const request$ = event.itemId
      ? this.subsidiesFacade.editSubsidy(event.itemId, event.newSubsidyData)
      : this.subsidiesFacade.addSubsidy(event.newSubsidyData);

    request$
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        tap(() => this.onCloseModal())
      )
      .subscribe();
  }

  applyFilterWord(keyword: string): void {
    this.subsidiesFacade.applyFilterWord(keyword);
  }
}
