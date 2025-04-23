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
import { PartnersFacade } from 'src/app/application/partners.facade';
import {
  ColumnModel,
  ColumnWidth,
} from 'src/app/core/interfaces/column.interface';
import { PartnerModel } from 'src/app/core/interfaces/partner.interface';
import {
  Filter,
  TypeActionModal,
  TypeList,
} from 'src/app/core/models/general.model';
import { PartnersService } from 'src/app/core/services/partners.services';
import { DashboardHeaderComponent } from 'src/app/modules/dashboard/components/dashboard-header/dashboard-header.component';
import { FiltersComponent } from 'src/app/modules/landing/components/filters/filters.component';
import { AddButtonComponent } from 'src/app/shared/components/buttons/button-add/button-add.component';
import { InputSearchComponent } from 'src/app/shared/components/inputs/input-search/input-search.component';
import { ModalComponent } from 'src/app/shared/components/modal/modal.component';
import { ModalService } from 'src/app/shared/components/modal/services/modal.service';
import { SpinnerLoadingComponent } from 'src/app/shared/components/spinner-loading/spinner-loading.component';
import { GeneralService } from 'src/app/shared/services/generalService.service';
import { TableComponent } from '../../components/table/table.component';

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
    SpinnerLoadingComponent,
    FiltersComponent,
    TableComponent,
  ],
  templateUrl: './partners-page.component.html',
  styleUrl: './partners-page.component.css',
})
export class PartnersPageComponent implements OnInit {
  private readonly destroyRef = inject(DestroyRef);
  private readonly modalService = inject(ModalService);
  private readonly partnersFacade = inject(PartnersFacade);
  private readonly partnersService = inject(PartnersService);
  private readonly generalService = inject(GeneralService);

  partners: PartnerModel[] = [];
  filteredPartners: PartnerModel[] = [];
  filters: Filter[] = [];
  selectedFilter: number | null = null;

  currentYear = this.generalService.currentYear;
  typeList = TypeList.Partners;
  isLoading = true;
  isModalVisible = false;
  number = 0;

  item: PartnerModel | null = null;
  currentModalAction: TypeActionModal = TypeActionModal.Create;
  searchForm!: FormGroup;
  headerListPartners: ColumnModel[] = [
    { title: 'Imagen', key: 'img', sortable: false },
    { title: 'Nombre', key: 'name', sortable: true },
    {
      title: 'Apellidos',
      key: 'surname',
      sortable: true,
      width: ColumnWidth.XL,
    },
    {
      title: 'Fecha nacimiento',
      key: 'birthday',
      sortable: true,
      width: ColumnWidth.LG,
    },
    { title: 'Dirección', key: 'town', sortable: true, width: ColumnWidth.XL },
    {
      title: 'Teléfono',
      key: 'phone',
      sortable: true,
      showIndicatorOnEmpty: true,
      width: ColumnWidth.XS,
      pipe: 'phoneFormat',
    },
    {
      title: 'Email',
      key: 'email',
      sortable: true,
      showIndicatorOnEmpty: true,
      width: ColumnWidth.LG,
    },
    {
      title: 'Última cuota',
      key: 'lastCuotaPaid',
      sortable: true,
      booleanIndicator: true,
      width: ColumnWidth.XS,
    },
    {
      title: 'Tiempo socia',
      key: 'years',
      sortable: true,
      width: ColumnWidth.XS,
    },
  ];

  @ViewChild(InputSearchComponent)
  private inputSearchComponent!: InputSearchComponent;

  ngOnInit(): void {
    this.filters = [
      { code: 'ALL', name: 'Histórico' },
      ...this.generalService.getYearFilters(1995, this.currentYear),
    ];

    this.modalService.modalVisibility$
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        tap((isVisible) => (this.isModalVisible = isVisible))
      )
      .subscribe();

    this.filterSelected(this.currentYear.toString());

    this.partnersFacade.filteredPartners$
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        tap((partners) => this.updatePartnerState(partners))
      )
      .subscribe();
  }

  filterSelected(filter: string): void {
    this.selectedFilter = filter === 'ALL' ? null : Number(filter);

    this.generalService.clearSearchInput(this.inputSearchComponent);
    if (filter === 'ALL') {
      this.partnersFacade.loadAllPartners();
    } else {
      this.partnersFacade.loadPartnersByYear(Number(filter));
    }
  }

  applyFilterWord(keyword: string): void {
    this.partnersFacade.applyFilterWord(keyword);
  }

  addNewPartnerModal(): void {
    this.openModal(TypeActionModal.Create, null);
  }

  onOpenModal(event: { action: TypeActionModal; item?: PartnerModel }): void {
    this.openModal(event.action, event.item ?? null);
  }

  openModal(action: TypeActionModal, partner: PartnerModel | null): void {
    this.currentModalAction = action;
    this.item = partner;
    this.modalService.openModal();
  }

  onCloseModal(): void {
    this.modalService.closeModal();
  }

  confirmDeletePartner(partner: PartnerModel | null): void {
    if (!partner) return;
    this.partnersFacade.deletePartner(partner.id);
    this.onCloseModal();
  }

  sendFormPartner(event: { itemId: number; formData: FormData }): void {
    const save$ = event.itemId
      ? this.partnersFacade.editPartner(event.itemId, event.formData)
      : this.partnersFacade.addPartner(event.formData);

    save$
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        tap(() => this.onCloseModal())
      )
      .subscribe();
  }

  private updatePartnerState(partners: PartnerModel[] | null): void {
    if (!partners) return;

    this.partners = this.partnersService.sortPartnersById(partners).map((p) => {
      const allCuotasPaid = p.cuotas || [];
      const lastCuotaPaid = allCuotasPaid.includes(this.currentYear);
      const years = allCuotasPaid.length;

      return {
        ...p,
        years,
        lastCuotaPaid,
      };
    });
    this.filteredPartners = [...this.partners];
    this.number = this.partnersService.countPartners(partners);
    this.isLoading = false;
  }
}
