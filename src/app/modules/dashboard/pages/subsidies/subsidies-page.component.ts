import {
  Component,
  DestroyRef,
  ElementRef,
  HostListener,
  inject,
  OnInit,
  ViewChild,
} from '@angular/core';
import { DashboardHeaderComponent } from 'src/app/modules/dashboard/components/dashboard-header/dashboard-header.component';
import {
  Filter,
  TypeActionModal,
  TypeList,
} from 'src/app/core/models/general.model';
import { SubsidiesService } from 'src/app/core/services/subsidies.services';
import { ModalComponent } from 'src/app/shared/components/modal/modal.component';
import { CommonModule } from '@angular/common';
import { FormControl, FormGroup, ReactiveFormsModule } from '@angular/forms';
import { ModalService } from 'src/app/shared/components/modal/services/modal.service';
import { tap } from 'rxjs';
import { AddButtonComponent } from 'src/app/shared/components/buttons/button-add/button-add.component';
import { InputSearchComponent } from 'src/app/shared/components/inputs/input-search/input-search.component';
import { FiltersComponent } from 'src/app/modules/landing/components/filters/filters.component';
import { MatTabChangeEvent, MatTabsModule } from '@angular/material/tabs';
import { SubsidiesFacade } from 'src/app/application/subsidies.facade';
import { SubsidyModel } from 'src/app/core/interfaces/subsidy.interface';
import { TableSubsidyComponent } from './components/table-subsidies/table-subsidy.component';
import { ModalShowSubsidyComponent } from './components/tab-subsidy/tab-subsidies.component';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { SpinnerLoadingComponent } from '../../../landing/components/spinner-loading/spinner-loading.component';
import { GeneralService } from 'src/app/shared/services/generalService.service';
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
  private subsidiesFacade = inject(SubsidiesFacade);
  private modalService = inject(ModalService);
  private destroyRef = inject(DestroyRef);
  private generalService = inject(GeneralService);

  showAllSubsidies: boolean = false;
  isActiveButtonList: boolean = false;
  selectedIndex: number = 0;
  selectedTypeFilter: string | null = null;
  typeList = TypeList;
  typeListModal: TypeList = TypeList.Subsidies;
  subsidies: SubsidyModel[] = [];
  filtersYears: Filter[] = [];
  filteredAllSubsidies: SubsidyModel[] = [];
  filteredSubsidies: SubsidyModel[] = [];
  currentFilterSubsidyType: string | null = null;
  currentTab: string | null = null;
  searchForm!: FormGroup;
  dataLoaded: boolean = false;
  number: number = 0;
  isModalVisible: boolean = false;
  currentModalAction: TypeActionModal = TypeActionModal.Create;
  item: any;
  searchKeywordFilter = new FormControl();
  isStickyToolbar: boolean = false;
  selectedFilterYear: number | null = new Date().getFullYear();

  @ViewChild('toolbar') toolbar!: ElementRef;

  @HostListener('window:scroll', [])
  onWindowScroll() {
    const scrollPosition =
      window.scrollY ||
      document.documentElement.scrollTop ||
      document.body.scrollTop ||
      0;

    if (scrollPosition > 50) {
      this.isStickyToolbar = true;
    } else {
      this.isStickyToolbar = false;
    }
  }
  ngOnInit(): void {
    const currentYear = this.generalService.currentYear;
    const startYear = 2018;

    for (let year = startYear; year <= currentYear; year++) {
      if (year === currentYear) {
        this.filtersYears.push({ code: year, name: `Año actual ${year}` });
      } else {
        this.filtersYears.push({
          code: year.toString(),
          name: year.toString(),
        });
      }
    }

    // Invertir el array para que el último año esté primero
    this.filtersYears.reverse();
    this.filtersYears.unshift({ code: '', name: 'Listado subvenciones' });
    this.loadAllSubsidies();

    // Suscripción a los cambios de visibilidad del modal
    this.modalService.modalVisibility$
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        tap((isVisible) => {
          this.isModalVisible = isVisible;
        })
      )
      .subscribe();
  }
  loadAllSubsidies(): void {
    this.showAllSubsidies = true;
    this.subsidiesFacade.loadAllSubsidies();
    this.subsidiesFacade.subsidies$
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        tap((subsidies) => {
          this.subsidies = subsidies;
          this.filteredAllSubsidies = subsidies;
          this.number = this.subsidies.length;
          this.dataLoaded = true;
        })
      )
      .subscribe();
  }

  loadSubsidiesByYears(filter: number): void {
    this.showAllSubsidies = false;
    this.subsidiesFacade.loadSubsidiesByYear(filter);
    this.subsidiesFacade.subsidies$
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        tap((subsidies) => {
          this.subsidies = subsidies;
          this.filteredSubsidies = subsidies;
          this.number = this.subsidies.length;
          this.dataLoaded = true;
        })
      )
      .subscribe();
  }

  loadSubsidies(): void {
    this.subsidiesFacade.loadAllSubsidies();
    this.subsidiesFacade.subsidies$
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        tap((subsidies) => {
          this.subsidies = subsidies;
          this.filteredSubsidies = subsidies;
          this.number = this.subsidies.length;
          this.dataLoaded = true;
        })
      )
      .subscribe();
  }
  filteredSubsidiesByType: { [key: string]: SubsidyModel[] } = {
    GENERALITAT: [],
    DIPUTACION: [],
    AYUNT_EQUIPAMIENTO: [],
    AYUNT_ACTIVIDADES: [],
    MINISTERIO: [],
  };

  filterYearSelected(filter: string): void {
    this.showAllSubsidies = false;
    if (filter === '') {
      this.selectedFilterYear = null;
      this.loadAllSubsidies();
    } else {
      // Convierte a número
      const year = Number(filter);

      // Verificar que sea un número válido
      if (!isNaN(year) && year > 0) {
        this.selectedFilterYear = year;
        this.subsidiesFacade.loadSubsidiesByYear(year);
        this.subsidiesFacade.subsidies$
          .pipe(
            takeUntilDestroyed(this.destroyRef),
            tap((subsidies) => {
              this.filteredAllSubsidies = subsidies; // Aquí asumes que ya hemos filtrado por año.
              this.classifySubsidies();
            })
          )
          .subscribe();
      } else {
        console.error(`El filtro proporcionado no es un año válido: ${filter}`);
      }
    }
  }

  classifySubsidies(): void {
    this.filteredSubsidiesByType = {
      GENERALITAT: [],
      DIPUTACION: [],
      AYUNT_EQUIPAMIENTO: [],
      AYUNT_ACTIVIDADES: [],
      MINISTERIO: [],
    };

    this.filteredAllSubsidies.forEach((subsidy) => {
      if (subsidy.name === 'GENERALITAT') {
        this.filteredSubsidiesByType['GENERALITAT'].push(subsidy);
      } else if (subsidy.name === 'DIPUTACION') {
        this.filteredSubsidiesByType['DIPUTACION'].push(subsidy);
      } else if (subsidy.name === 'AYUNT_EQUIPAMIENTO') {
        this.filteredSubsidiesByType['AYUNT_EQUIPAMIENTO'].push(subsidy);
      } else if (subsidy.name === 'AYUNT_ACTIVIDADES') {
        this.filteredSubsidiesByType['AYUNT_ACTIVIDADES'].push(subsidy);
      } else if (subsidy.name === 'MINISTERIO') {
        this.filteredSubsidiesByType['MINISTERIO'].push(subsidy);
      }
    });
  }

  tabActive(event: MatTabChangeEvent): void {
    this.currentTab = event.tab.textLabel;

    switch (this.currentTab) {
      case 'GENERALITAT':
        this.currentFilterSubsidyType = 'Factura';
        break;
      case 'DIPUTACION':
        this.currentFilterSubsidyType = 'Ticket';
        break;
      case 'AYUNT_ACTIVIDADES':
        this.currentFilterSubsidyType = 'Ingreso';
        break;
      case 'AYUNT_EQUIPAMIENTO':
        this.currentFilterSubsidyType = 'Ingreso';
        break;
      case 'MINISTERIO':
        this.currentFilterSubsidyType = null; // Deja el tipo de filtro en null
        break;
      default:
        this.currentFilterSubsidyType = null;
        break;
    }

    if (this.currentFilterSubsidyType !== null) {
      this.subsidiesFacade.applyFilterTab(this.currentFilterSubsidyType);
    } else {
      this.clearFilter();
    }
  }

  // applyFiltersWords(keyword: string): void {
  //   this.subsidiesFacade.applyFiltersWords(keyword);
  // }

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
    if (event.itemId) {
      this.subsidiesFacade.editSubsidy(event.itemId, event.newSubsidyData);
      // Después de editar, recarga las facturas y aplica el filtro
      this.subsidiesFacade.loadAllSubsidies();
      // this.subsidiesFacade.applyFilterTab(this.currentFilterSubsidyType); // Aplicar el filtro actual
    } else {
      this.subsidiesFacade
        .addSubsidy(event.newSubsidyData)
        .pipe(
          takeUntilDestroyed(this.destroyRef),
          tap(() => {
            // this.subsidiesFacade.applyFilterTab(this.currentFilterSubsidyType);
            this.onCloseModal();
          })
        )
        .subscribe();
    }
    this.onCloseModal();
  }

  applyFilter(keyword: string): void {
    if (!keyword) {
      this.filteredSubsidies = this.subsidies; // Si no hay palabra clave, mostrar todos los libros
    } else {
      keyword = keyword.toLowerCase();
      this.filteredSubsidies = this.subsidies.filter(
        (book) => Object.values(book).join(' ').toLowerCase().includes(keyword) // Filtrar libros por la palabra clave
      );
    }
    this.number = this.filteredSubsidies.length; // Actualizar el conteo de libros filtrados
  }
}
