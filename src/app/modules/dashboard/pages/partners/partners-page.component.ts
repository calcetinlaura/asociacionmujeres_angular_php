import { CommonModule } from '@angular/common';
import {
  Component,
  DestroyRef,
  ElementRef,
  OnInit,
  Signal,
  ViewChild,
  WritableSignal,
  computed,
  inject,
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
import { IconActionComponent } from 'src/app/shared/components/buttons/icon-action/icon-action.component';
import { InputSearchComponent } from 'src/app/shared/components/inputs/input-search/input-search.component';
import { SpinnerLoadingComponent } from 'src/app/shared/components/spinner-loading/spinner-loading.component';
import { GeneralService } from 'src/app/shared/services/generalService.service';
import { PdfPrintService } from 'src/app/shared/services/PdfPrintService.service';
import { normalizeCuotas } from 'src/app/shared/utils/cuotas.utils';
import { StickyZoneComponent } from '../../components/sticky-zone/sticky-zone.component';
import { ColumnMenuComponent } from '../../components/table/column-menu.component';
import { TableComponent } from '../../components/table/table.component';

// 🧩 nuevo shell (sustituye a <app-modal>)
import { ModalShellComponent } from 'src/app/shared/components/modal/modal-shell.component';
// 🧩 store de visibilidad de columnas (signals)
import { ColumnVisibilityStore } from '../../components/table/column-visibility.store';
// ModalService para abrir/cerrar (ya lo usabas)
import { ModalService } from 'src/app/shared/components/modal/services/modal.service';

@Component({
  selector: 'app-partners-page',
  standalone: true,
  imports: [
    DashboardHeaderComponent,
    ButtonIconComponent,
    ReactiveFormsModule,
    InputSearchComponent,
    SpinnerLoadingComponent,
    FiltersComponent,
    TableComponent,
    MatCheckboxModule,
    MatMenuModule,
    IconActionComponent,
    CommonModule,
    StickyZoneComponent,
    ColumnMenuComponent,
    ModalShellComponent, // 👈 usamos el shell
  ],
  templateUrl: './partners-page.component.html',
})
export class PartnersPageComponent implements OnInit {
  // Services
  private readonly destroyRef = inject(DestroyRef);
  private readonly modalService = inject(ModalService);
  private readonly partnersService = inject(PartnersService);
  private readonly generalService = inject(GeneralService);
  private readonly pdfPrintService = inject(PdfPrintService);
  private readonly colStore = inject(ColumnVisibilityStore);

  // Facade (pública para template)
  readonly partnersFacade = inject(PartnersFacade);

  // Columnas (config)
  headerListPartners: ColumnModel[] = [
    { title: 'Imagen', key: 'img', sortable: false },
    {
      title: 'Nombre',
      key: 'name',
      sortable: true,
      textAlign: 'center',
      width: ColumnWidth.LG,
    },
    {
      title: 'Apellidos',
      key: 'surname',
      sortable: true,
      textAlign: 'center',
      width: ColumnWidth.LG,
    },
    {
      title: 'Fecha nacimiento',
      key: 'birthday',
      sortable: true,
      width: ColumnWidth.LG,
      textAlign: 'center',
    },
    {
      title: 'Dirección',
      key: 'town',
      sortable: true,
      width: ColumnWidth.FULL,
      textAlign: 'center',
    },
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
      textAlign: 'center',
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
      title: 'Último método pago',
      key: 'lastMethodPaid',
      sortable: true,
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

  // ✅ signals para visibilidad de columnas
  columnVisSig!: WritableSignal<Record<string, boolean>>;
  displayedColumnsSig!: Signal<string[]>;

  // Datos
  partners: PartnerModel[] = [];
  filteredPartners: PartnerModel[] = [];
  filters: Filter[] = [];
  selectedFilter: number | null = null;

  // Modal
  isModalVisible = false;
  number = 0;
  item: PartnerModel | null = null;
  currentModalAction: TypeActionModal = TypeActionModal.Create;

  currentYear = this.generalService.currentYear;
  typeModal = TypeList.Partners;
  typeSection = TypeList.Partners;

  // Form
  searchForm!: FormGroup;

  @ViewChild(InputSearchComponent)
  private inputSearchComponent!: InputSearchComponent;

  @ViewChild('printArea', { static: false })
  printArea!: ElementRef<HTMLElement>;

  // ──────────────────────────────────────────────────────────────────────────────
  // Lifecycle
  // ──────────────────────────────────────────────────────────────────────────────
  ngOnInit(): void {
    // 1) Inicializa visibilidad con clave única por tabla
    this.columnVisSig = this.colStore.init(
      'partners-table',
      this.headerListPartners,
      []
    );
    // 2) Derivada con keys visibles
    this.displayedColumnsSig = computed(() =>
      this.colStore.displayedColumns(
        this.headerListPartners,
        this.columnVisSig()
      )
    );

    this.filters = [
      { code: '', name: 'Histórico' },
      ...this.generalService.getYearFilters(1995, this.currentYear),
    ];

    // Modal on/off
    this.modalService.modalVisibility$
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        tap((v) => (this.isModalVisible = v))
      )
      .subscribe();

    // Filtro por año inicial
    this.filterSelected(this.currentYear.toString());

    // Estado desde fachada
    this.partnersFacade.filteredPartners$
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        tap((partners) => this.updatePartnerState(partners))
      )
      .subscribe();
  }

  // ──────────────────────────────────────────────────────────────────────────────
  // Filtros / búsqueda
  // ──────────────────────────────────────────────────────────────────────────────
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

  // ──────────────────────────────────────────────────────────────────────────────
  // Modal
  // ──────────────────────────────────────────────────────────────────────────────
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

    // 🔑 limpiar seleccionado SOLO en Create (para evitar abrir vacío al ver/editar)
    if (typeModal === TypeList.Partners && action === TypeActionModal.Create) {
      this.partnersFacade.clearSelectedPartner();
    }

    this.modalService.openModal();
  }

  onCloseModal(): void {
    this.modalService.closeModal();
    this.item = null; // 🔥 limpieza de referencia
  }

  // ──────────────────────────────────────────────────────────────────────────────
  // CRUD
  // ──────────────────────────────────────────────────────────────────────────────
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

  // ──────────────────────────────────────────────────────────────────────────────
  // Tabla helpers
  // ──────────────────────────────────────────────────────────────────────────────
  private updatePartnerState(partners: PartnerModel[] | null): void {
    if (!partners) return;

    this.partners = this.partnersService.sortPartnersById(partners).map((p) => {
      const cuotas = normalizeCuotas(p.cuotas);

      // años pagados y últimos
      const paidYears = cuotas.filter((c) => c.paid).map((c) => c.year);
      const years = paidYears.length;
      const lastCuotaPaid = paidYears.includes(this.currentYear);
      const lastPaidYear = paidYears.length ? Math.max(...paidYears) : null;

      // 👇 NUEVO: método de pago de la última cuota pagada
      const lastPaidCuota = lastPaidYear
        ? cuotas.find((c) => c.year === lastPaidYear && c.paid)
        : undefined;

      const lastMethodPaid = this.mapPaymentMethodLabel(
        lastPaidCuota?.method_payment ?? null
      );

      return {
        ...p,
        years,
        lastCuotaPaid,
        lastPaidYear,
        lastMethodPaid, // 👈 esta clave coincide con la columna 'Último método pago'
      };
    });

    this.filteredPartners = [...this.partners];
    this.number = this.partnersService.countPartners(partners);
  }

  private mapPaymentMethodLabel(
    method?: 'cash' | 'domiciliation' | null
  ): string {
    switch (method) {
      case 'cash':
        return 'Efectivo';
      case 'domiciliation':
        return 'Domiciliación';
      default:
        return '-';
    }
  }
  getVisibleColumns() {
    return this.colStore.visibleColumnModels(
      this.headerListPartners,
      this.columnVisSig()
    );
  }

  toggleColumn(key: string): void {
    this.colStore.toggle('partners-table', this.columnVisSig, key);
  }

  // ──────────────────────────────────────────────────────────────────────────────
  // Impresión
  // ──────────────────────────────────────────────────────────────────────────────
  async printTableAsPdf(): Promise<void> {
    if (!this.printArea) return;

    await this.pdfPrintService.printElementAsPdf(this.printArea, {
      filename: 'partners.pdf',
      preset: 'compact',
      orientation: 'landscape',
      format: 'a4',
      margins: [5, 5, 5, 5],
    });
  }
}
