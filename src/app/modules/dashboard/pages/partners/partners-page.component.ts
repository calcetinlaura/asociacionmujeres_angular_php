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
import { TableComponent } from '../../components/table/table.component';

@Component({
  selector: 'app-partners-page',
  standalone: true,
  imports: [
    DashboardHeaderComponent,
    ModalComponent,
    ButtonIconComponent,
    ReactiveFormsModule,
    InputSearchComponent,
    SpinnerLoadingComponent,
    FiltersComponent,
    TableComponent,
    MatCheckboxModule,
    MatMenuModule,
    ButtonComponent,
    IconActionComponent,
    CommonModule,
    StickyZoneComponent,
  ],
  templateUrl: './partners-page.component.html',
})
export class PartnersPageComponent implements OnInit {
  private readonly destroyRef = inject(DestroyRef);
  private readonly modalService = inject(ModalService);
  readonly partnersFacade = inject(PartnersFacade);
  private readonly partnersService = inject(PartnersService);
  private readonly generalService = inject(GeneralService);
  private readonly pdfPrintService = inject(PdfPrintService);

  columnVisibility: Record<string, boolean> = {};
  displayedColumns: string[] = [];
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
      textAlign: 'center',
    },
    { title: 'Dirección', key: 'town', sortable: true, width: ColumnWidth.XL },
    {
      title: 'Teléfono',
      key: 'phone',
      sortable: true,
      showIndicatorOnEmpty: true,
      width: ColumnWidth.XS,
      pipe: 'phoneFormat',
      textAlign: 'center',
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
      textAlign: 'center',
    },
    {
      title: 'Tiempo socia',
      key: 'years',
      sortable: true,
      width: ColumnWidth.XS,
      textAlign: 'center',
    },
  ];

  partners: PartnerModel[] = [];
  filteredPartners: PartnerModel[] = [];
  filters: Filter[] = [];
  selectedFilter: number | null = null;

  isModalVisible = false;
  number = 0;

  item: PartnerModel | null = null;
  currentModalAction: TypeActionModal = TypeActionModal.Create;
  searchForm!: FormGroup;

  currentYear = this.generalService.currentYear;
  typeModal = TypeList.Partners;
  typeSection = TypeList.Partners;

  @ViewChild(InputSearchComponent)
  private inputSearchComponent!: InputSearchComponent;

  @ViewChild('printArea', { static: false })
  printArea!: ElementRef<HTMLElement>;

  ngOnInit(): void {
    // Columnas visibles iniciales
    this.columnVisibility = this.generalService.setColumnVisibility(
      this.headerListPartners,
      [''] // Coloca las columnas que deseas ocultar aquí
    );

    // Actualiza las columnas visibles según el estado de visibilidad
    this.displayedColumns = this.generalService.updateDisplayedColumns(
      this.headerListPartners,
      this.columnVisibility
    );
    this.filters = [
      { code: '', name: 'Histórico' },
      ...this.generalService.getYearFilters(1995, this.currentYear),
    ];

    this.modalService.modalVisibility$
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        tap((isVisible) => (this.isModalVisible = isVisible))
      )
      .subscribe();

    this.filterSelected(this.currentYear.toString());

    // Estado de socias desde la fachada
    this.partnersFacade.filteredPartners$
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        tap((partners) => this.updatePartnerState(partners))
      )
      .subscribe();
  }

  filterSelected(filter: string): void {
    this.selectedFilter = filter === '' ? null : Number(filter);

    this.generalService.clearSearchInput(this.inputSearchComponent);

    if (!filter) {
      this.partnersFacade.loadAllPartners();
    } else {
      this.partnersFacade.loadPartnersByYear(Number(filter));
    }
  }

  applyFilterWord(keyword: string): void {
    this.partnersFacade.applyFilterWord(keyword);
  }

  addNewPartnerModal(): void {
    this.openModal(this.typeModal, TypeActionModal.Create, null);
  }

  onOpenModal(event: {
    typeModal: TypeList;
    action: TypeActionModal;
    item?: PartnerModel;
  }): void {
    this.openModal(event.typeModal, event.action, event.item ?? null);
  }

  openModal(
    typeModal: TypeList,
    action: TypeActionModal,
    partner: PartnerModel | null
  ): void {
    this.currentModalAction = action;
    this.item = partner;
    this.typeModal = typeModal;
    this.partnersFacade.clearSelectedPartner();
    this.modalService.openModal();
  }

  onCloseModal(): void {
    this.modalService.closeModal();
  }

  onDelete({ type, id }: { type: TypeList; id: number }) {
    const actions: Partial<Record<TypeList, (id: number) => void>> = {
      [TypeList.Partners]: (x) => this.partnersFacade.deletePartner(x),
    };
    actions[type]?.(id);
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
  }

  async printTableAsPdf(): Promise<void> {
    if (!this.printArea) return;

    await this.pdfPrintService.printElementAsPdf(this.printArea, {
      filename: 'facturas.pdf',
      preset: 'compact', // 'compact' reduce paddings en celdas
      orientation: 'landscape', // o 'landscape' si la tabla es muy ancha
      format: 'a4',
      margins: [5, 5, 5, 5], // mm
    });
  }

  getVisibleColumns() {
    return this.headerListPartners.filter(
      (col) => this.columnVisibility[col.key]
    );
  }

  // Método para actualizar las columnas visibles cuando se hace toggle
  toggleColumn(key: string): void {
    this.columnVisibility[key] = !this.columnVisibility[key];
    this.displayedColumns = this.generalService.updateDisplayedColumns(
      this.headerListPartners,
      this.columnVisibility
    );
  }
}
