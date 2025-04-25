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
  ColumnModel,
  ColumnWidth,
} from 'src/app/core/interfaces/column.interface';
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
import { ButtonIconComponent } from 'src/app/shared/components/buttons/button-icon/button-icon.component';
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
    ButtonIconComponent,
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

  // Estado de UI
  typeList = TypeList;
  typeListModal: TypeList = TypeList.Subsidies;
  currentModalAction: TypeActionModal = TypeActionModal.Create;
  selectedFilter: number | null = null;
  selectedIndex: number = 0;
  isModalVisible = false;
  showAllSubsidies = false;
  isLoading = true;
  number = 0;
  item: any;
  currentYear = this.generalService.currentYear;

  // Datos
  subsidies: SubsidyModelFullData[] = [];
  filteredSubsidies: SubsidyModelFullData[] = [];
  filtersYears: Filter[] = [];
  filteredSubsidiesByType: { [key: string]: SubsidyModelFullData[] } = {};
  visibleTabs: { label: string; item: SubsidyModelFullData }[] = [];

  // Columnas
  headerListSubsidies: ColumnModel[] = [
    {
      title: 'Nombre',
      key: 'nameSubsidy',
      sortable: true,
      pipe: 'i18nSelect : nameSubsidy',
    },
    { title: 'Año', key: 'year', sortable: true, width: ColumnWidth.XS },
    {
      title: 'Fecha Max. Presentación',
      key: 'date_presentation',
      sortable: true,
      pipe: 'date : dd MMM yyyy',
      width: ColumnWidth.XS,
      showIndicatorOnEmpty: true,
    },
    {
      title: 'Fecha Max. Justificación',
      key: 'date_justification',
      sortable: true,
      pipe: 'date : dd MMM yyyy',
      width: ColumnWidth.XS,
      showIndicatorOnEmpty: true,
    },
    {
      title: 'Periodo',
      key: 'start',
      sortable: true,
      width: ColumnWidth.XS,
      showIndicatorOnEmpty: true,
    },
    {
      title: 'Proyectos',
      key: 'projects',
      sortable: true,
      width: ColumnWidth.XS,
      showLengthOnly: true,
    },
    {
      title: 'Facturas',
      key: 'invoices',
      sortable: true,
      width: ColumnWidth.XS,
      showLengthOnly: true,
    },
    {
      title: 'Link Bases',
      key: 'url_presentation',
      sortable: true,
      width: ColumnWidth.XS,
      booleanIndicator: true,
    },
    {
      title: 'Link Resolución',
      key: 'url_justification',
      sortable: true,
      width: ColumnWidth.XS,
      booleanIndicator: true,
    },
    {
      title: 'Cant. Solicitada',
      key: 'amount_requested',
      sortable: true,
      width: ColumnWidth.XS,
      pipe: 'eurosFormat',
      showIndicatorOnEmpty: true,
    },
    {
      title: 'Cant. Adjudicada',
      key: 'amount_granted',
      sortable: true,
      width: ColumnWidth.XS,
      pipe: 'eurosFormat',
      footerTotal: true,
      showIndicatorOnEmpty: true,
    },
    {
      title: 'Cant. Justificada',
      key: 'amount_justified',
      sortable: true,
      width: ColumnWidth.XS,
      pipe: 'eurosFormat',
      showIndicatorOnEmpty: true,
    },
    {
      title: 'Cant. Asociación',
      key: 'amount_association',
      sortable: true,
      width: ColumnWidth.XS,
      pipe: 'eurosFormat',
      footerTotal: true,
      showIndicatorOnEmpty: true,
    },
  ];

  ngOnInit(): void {
    this.filtersYears = [
      { code: 'ALL', name: 'Histórico' },
      ...this.generalService.getYearFilters(2018, this.currentYear),
    ];

    this.modalService.modalVisibility$
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((isVisible) => (this.isModalVisible = isVisible));

    this.subsidiesFacade.filteredSubsidies$
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((subsidies) => this.updateSubsidyState(subsidies));

    this.filterSelected('ALL');
  }

  filterSelected(filter: string): void {
    this.selectedFilter = filter === 'ALL' ? null : Number(filter);
    this.isLoading = true;
    this.visibleTabs = [];

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
    this.filteredSubsidiesByType = {};
    this.visibleTabs = [];

    categoryFilterSubsidies.forEach((filter) => {
      this.filteredSubsidiesByType[filter.code] = [];
    });

    subsidies.forEach((subsidy) => {
      const code = subsidy.name;
      if (this.filteredSubsidiesByType[code]) {
        this.filteredSubsidiesByType[code].push(subsidy);
      }
    });

    this.visibleTabs = categoryFilterSubsidies
      .map((filter) => {
        const items = this.filteredSubsidiesByType[filter.code];
        return items.length > 0
          ? { label: 'Sub. ' + filter.name, item: items[0] }
          : null;
      })
      .filter(
        (tab): tab is { label: string; item: SubsidyModelFullData } =>
          tab !== null
      );
  }

  tabActive(event: MatTabChangeEvent): void {
    this.selectedIndex = event.index;
    setTimeout(() => {
      const selectedTab = this.tabSubsidies.toArray()[event.index];
      selectedTab?.load();
    });
  }

  addNewSubsidyModal(): void {
    this.openModal(this.typeListModal, TypeActionModal.Create, null);
  }

  onOpenModal(event: {
    type: TypeList;
    action: TypeActionModal;
    item: SubsidyModel;
  }): void {
    this.openModal(event.type, event.action, event.item ?? null);
  }

  private openModal(
    type: TypeList,
    action: TypeActionModal,
    item: SubsidyModel | null
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
    if (!subsidy?.id) return;
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
    this.classifySubsidies(this.subsidies);
    this.isLoading = false;
    this.selectedIndex = 0;
  }
}
