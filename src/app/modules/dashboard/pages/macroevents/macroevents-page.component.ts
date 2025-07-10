
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
import { MacroeventsFacade } from 'src/app/application/macroevents.facade';
import {
  ColumnModel,
  ColumnWidth,
} from 'src/app/core/interfaces/column.interface';
import { MacroeventModelFullData } from 'src/app/core/interfaces/macroevent.interface';
import {
  Filter,
  TypeActionModal,
  TypeList,
} from 'src/app/core/models/general.model';
import { MacroeventsService } from 'src/app/core/services/macroevents.services';
import { DashboardHeaderComponent } from 'src/app/modules/dashboard/components/dashboard-header/dashboard-header.component';
import { TableComponent } from 'src/app/modules/dashboard/components/table/table.component';
import { FiltersComponent } from 'src/app/modules/landing/components/filters/filters.component';
import { ButtonIconComponent } from 'src/app/shared/components/buttons/button-icon/button-icon.component';
import { InputSearchComponent } from 'src/app/shared/components/inputs/input-search/input-search.component';
import { ModalComponent } from 'src/app/shared/components/modal/modal.component';
import { ModalService } from 'src/app/shared/components/modal/services/modal.service';
import { SpinnerLoadingComponent } from 'src/app/shared/components/spinner-loading/spinner-loading.component';
import { GeneralService } from 'src/app/shared/services/generalService.service';

@Component({
    selector: 'app-macroevents-page',
    imports: [
    DashboardHeaderComponent,
    ModalComponent,
    ButtonIconComponent,
    ReactiveFormsModule,
    InputSearchComponent,
    SpinnerLoadingComponent,
    TableComponent,
    FiltersComponent
],
    templateUrl: './macroevents-page.component.html',
    styleUrl: './macroevents-page.component.css'
})
export class MacroeventsPageComponent implements OnInit {
  private readonly destroyRef = inject(DestroyRef);
  private readonly modalService = inject(ModalService);
  private readonly macroeventsFacade = inject(MacroeventsFacade);
  private readonly macroeventsService = inject(MacroeventsService);
  private readonly generalService = inject(GeneralService);

  macroevents: MacroeventModelFullData[] = [];
  filteredMacroevents: MacroeventModelFullData[] = [];
  filters: Filter[] = [];

  selectedFilter: number | null = null;
  currentYear = this.generalService.currentYear;
  typeList = TypeList.Macroevents;
  isLoading = true;
  isModalVisible = false;
  number = 0;

  item: MacroeventModelFullData | null = null;
  currentModalAction: TypeActionModal = TypeActionModal.Create;
  searchForm!: FormGroup;

  headerListMacroevents: ColumnModel[] = [
    { title: 'Cartel', key: 'img', sortable: false },
    { title: 'Título', key: 'title', sortable: true },
    { title: 'Fecha', key: 'start', sortable: true, width: ColumnWidth.SM },
    { title: 'Eventos', key: 'events', sortable: true },
    {
      title: 'Descripción',
      key: 'description',
      sortable: true,
      booleanIndicator: true,
      width: ColumnWidth.SM,
    },
    { title: 'Municipio', key: 'town', sortable: true, width: ColumnWidth.SM },
  ];

  @ViewChild(InputSearchComponent)
  private inputSearchComponent!: InputSearchComponent;

  ngOnInit(): void {
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

    this.macroeventsFacade.filteredMacroevents$
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        tap((macroevents) => this.updateMacroeventState(macroevents))
      )
      .subscribe();
  }

  filterSelected(filter: string): void {
    this.selectedFilter = filter === 'ALL' ? null : Number(filter);

    this.generalService.clearSearchInput(this.inputSearchComponent);

    if (filter === 'ALL') {
      this.macroeventsFacade.setCurrentFilter(null); // aún puedes guardar como null
      this.macroeventsFacade.loadAllMacroevents();
    } else {
      this.macroeventsFacade.setCurrentFilter(Number(filter));
      this.macroeventsFacade.loadMacroeventsByYear(Number(filter));
    }
  }

  applyFilterWord(keyword: string): void {
    this.macroeventsFacade.applyFilterWord(keyword);
  }

  addNewMacroeventModal(): void {
    this.openModal(TypeActionModal.Create, null);
  }

  onOpenModal(macroevent: {
    action: TypeActionModal;
    item?: MacroeventModelFullData;
  }): void {
    this.openModal(macroevent.action, macroevent.item ?? null);
  }

  private openModal(
    action: TypeActionModal,
    item: MacroeventModelFullData | null
  ): void {
    this.currentModalAction = action;
    this.item = item;
    this.modalService.openModal();
  }

  onCloseModal(): void {
    this.modalService.closeModal();
  }

  confirmDeleteMacroevent(macroevent: MacroeventModelFullData | null): void {
    if (!macroevent) return;
    this.macroeventsFacade.deleteMacroevent(macroevent.id);
    this.onCloseModal();
  }

  sendFormMacroevent(macroevent: { itemId: number; formData: FormData }): void {
    const request$ = macroevent.itemId
      ? this.macroeventsFacade.editMacroevent(
          macroevent.itemId,
          macroevent.formData
        )
      : this.macroeventsFacade.addMacroevent(macroevent.formData);

    request$
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        tap(() => this.onCloseModal())
      )
      .subscribe();
  }

  private updateMacroeventState(
    macroevents: MacroeventModelFullData[] | null
  ): void {
    if (!macroevents) return;

    this.macroevents = this.macroeventsService.sortMacroeventsById(macroevents);
    this.filteredMacroevents = [...this.macroevents];
    this.number = this.macroeventsService.countMacroevents(macroevents);
    this.isLoading = false;
  }
}
