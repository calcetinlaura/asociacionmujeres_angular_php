import {
  Component,
  DestroyRef,
  ElementRef,
  HostListener,
  inject,
  OnInit,
  ViewChild,
} from '@angular/core';
import { DashboardHeaderComponent } from '../../components/dashboard-header/dashboard-header.component';
import {
  Filter,
  TypeActionModal,
  TypeList,
} from 'src/app/core/models/general.model';
import { ColumnModel } from 'src/app/core/interfaces/column.interface';
import { PartnersService } from 'src/app/core/services/partners.services';
import { ModalComponent } from 'src/app/shared/components/modal/modal.component';
import { CommonModule } from '@angular/common';
import { PartnersFacade } from 'src/app/application';
import { FormControl, FormGroup, ReactiveFormsModule } from '@angular/forms';
import { ModalService } from 'src/app/shared/components/modal/services/modal.service';
import { tap } from 'rxjs';
import { AddButtonComponent } from 'src/app/shared/components/buttons/button-add/button-add.component';
import { InputSearchComponent } from 'src/app/shared/components/inputs/input-search/input-search.component';
import { PartnerModel } from 'src/app/core/interfaces/partner.interface';
import { FiltersComponent } from '../../../landing/components/filters/filters.component';
import { TablePartnersComponent } from './components/table-partners/table-partners.component';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { SpinnerLoadingComponent } from '../../../landing/components/spinner-loading/spinner-loading.component';
import { GeneralService } from 'src/app/shared/services/generalService.service';

@Component({
  selector: 'app-partners-page',
  standalone: true,
  imports: [
    CommonModule,
    DashboardHeaderComponent,
    ModalComponent,
    AddButtonComponent,
    ReactiveFormsModule,
    InputSearchComponent,
    FiltersComponent,
    TablePartnersComponent,
    SpinnerLoadingComponent,
  ],
  providers: [PartnersService],
  templateUrl: './partners-page.component.html',
  styleUrl: './partners-page.component.css',
})
export class PartnersPageComponent implements OnInit {
  private partnersFacade = inject(PartnersFacade);
  private modalService = inject(ModalService);
  private destroyRef = inject(DestroyRef);
  private generalService = inject(GeneralService);

  typeList = TypeList.Partners;
  partners: PartnerModel[] = [];
  filteredPartners: PartnerModel[] = [];
  filtersYears: Filter[] = [];
  searchForm!: FormGroup;
  dataLoaded: boolean = false;
  number: number = 0;
  headerListPartners: ColumnModel[] = [];
  isModalVisible: boolean = false;
  currentModalAction: TypeActionModal = TypeActionModal.Create;
  item: any;
  searchKeywordFilter = new FormControl();
  isStickyToolbar: boolean = false;
  selectedFilterYear: number | null = null;

  @ViewChild('toolbar') toolbar!: ElementRef;

  @HostListener('window:scroll', [])
  onWindowScroll() {
    const scrollPosition =
      window.scrollY ||
      document.documentElement.scrollTop ||
      document.body.scrollTop ||
      0;

    // Hacer sticky la toolbar al hacer scroll más de 300px (justo después de la cabecera)
    if (scrollPosition > 50) {
      this.isStickyToolbar = true;
    } else {
      this.isStickyToolbar = false;
    }
  }

  ngOnInit(): void {
    const currentYear = this.generalService.currentYear;
    const startYear = 1995;

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
    this.filtersYears.reverse();
    this.filtersYears.unshift({ code: '', name: 'Listado socias' });
    this.loadAllPartners();

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

  loadAllPartners(): void {
    this.partnersFacade.loadAllPartners();
    this.partnersFacade.partners$
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        tap((partners) => {
          if (partners === null) {
            return;
          }
          this.partners = partners;
          this.filteredPartners = partners;
          this.number = this.partners.length;
          this.dataLoaded = true;
        })
      )
      .subscribe();
  }

  filterYearSelected(filter: string): void {
    if (filter === '') {
      this.selectedFilterYear = null;
      this.loadAllPartners();
    } else {
      const year = Number(filter);
      if (!isNaN(year) && year > 0) {
        this.selectedFilterYear = year;
        this.partnersFacade.loadPartnersByYear(year);
        this.partnersFacade.partners$
          .pipe(
            takeUntilDestroyed(this.destroyRef),
            tap((partners) => {
              if (partners === null) {
                this.partners = [];
                this.filteredPartners = [];
                this.number = 0;
                this.dataLoaded = true;
              } else {
                this.partners = partners;
                this.filteredPartners = partners;
                this.number = this.partners.length;
                this.dataLoaded = true;
              }
            })
          )
          .subscribe();
      } else {
        console.error(`El filtro proporcionado no es un año válido: ${filter}`);
      }
    }
  }
  applyFilter(keyword: string): void {
    if (!keyword) {
      this.filteredPartners = this.partners; // Si no hay palabra clave, mostrar todos los libros
    } else {
      keyword = keyword.toLowerCase();
      this.filteredPartners = this.partners.filter(
        (partner) =>
          Object.values(partner).join(' ').toLowerCase().includes(keyword) // Filtrar libros por la palabra clave
      );
    }
    this.number = this.filteredPartners.length; // Actualizar el conteo de libros filtrados
  }

  confirmDeletePartner(item: any): void {
    this.partnersFacade.deletePartner(item.id);
    this.onCloseModal();
  }

  addNewPartnerModal(): void {
    this.currentModalAction = TypeActionModal.Create;
    this.item = null; // Reseteamos el item para un nuevo libro
    this.modalService.openModal();
  }

  onOpenModal(event: { action: TypeActionModal; item?: any }): void {
    this.currentModalAction = event.action;
    this.item = event.item;
    this.modalService.openModal();
  }

  onCloseModal(): void {
    this.modalService.closeModal();
  }

  sendFormPartner(event: {
    itemId: number;
    newPartnerData: PartnerModel;
  }): void {
    if (event.itemId) {
      this.partnersFacade.editPartner(event.itemId, event.newPartnerData);
    } else {
      this.partnersFacade
        .addPartner(event.newPartnerData)
        .pipe(
          takeUntilDestroyed(this.destroyRef),
          tap(() => {
            this.onCloseModal();
          })
        )
        .subscribe();
    }
    this.onCloseModal();
  }
}
