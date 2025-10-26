import { CommonModule } from '@angular/common';
import {
  Component,
  DestroyRef,
  ElementRef,
  OnInit,
  ViewChild,
  computed,
  inject,
} from '@angular/core';
import { takeUntilDestroyed, toSignal } from '@angular/core/rxjs-interop';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatMenuModule } from '@angular/material/menu';
import { map, tap } from 'rxjs';

import { PartnersFacade } from 'src/app/application/partners.facade';
import {
  ColumnModel,
  ColumnWidth,
} from 'src/app/core/interfaces/column.interface';
import { Filter } from 'src/app/core/interfaces/general.interface';
import { PartnerModel } from 'src/app/core/interfaces/partner.interface';
import { TypeActionModal, TypeList } from 'src/app/core/models/general.model';
import { PartnersService } from 'src/app/core/services/partners.services';

import { GeneralService } from 'src/app/core/services/generalService.service';
import { PdfPrintService } from 'src/app/core/services/PdfPrintService.service';
import { DashboardHeaderComponent } from 'src/app/shared/components/dashboard-header/dashboard-header.component';
import { FiltersComponent } from 'src/app/shared/components/filters/filters.component';
import { SpinnerLoadingComponent } from 'src/app/shared/components/spinner-loading/spinner-loading.component';
import { StickyZoneComponent } from 'src/app/shared/components/sticky-zone/sticky-zone.component';
import { TableComponent } from 'src/app/shared/components/table/table.component';
import { normalizeCuotas } from 'src/app/shared/utils/cuotas.utils';

// Shell de modal
import { ModalShellComponent } from 'src/app/shared/components/modal/modal-shell.component';
// Hooks reutilizables
import { useColumnVisibility } from 'src/app/shared/hooks/use-column-visibility';
import { useEntityList } from 'src/app/shared/hooks/use-entity-list';
// Servicio para abrir/cerrar modal
import { ModalService } from 'src/app/shared/components/modal/services/modal.service';
import { PageToolbarComponent } from 'src/app/shared/components/page-toolbar/page-toolbar.component';

@Component({
  selector: 'app-partners-page',
  standalone: true,
  imports: [
    DashboardHeaderComponent,
    SpinnerLoadingComponent,
    FiltersComponent,
    TableComponent,
    MatCheckboxModule,
    MatMenuModule,
    CommonModule,
    StickyZoneComponent,
    ModalShellComponent,
    PageToolbarComponent,
  ],
  templateUrl: './partners-page.component.html',
})
export class PartnersPageComponent implements OnInit {
  private readonly destroyRef = inject(DestroyRef);
  private readonly modalService = inject(ModalService);
  private readonly partnersService = inject(PartnersService);
  private readonly generalService = inject(GeneralService);
  private readonly pdfPrintService = inject(PdfPrintService);

  // Facade
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
      showIndicatorOnEmpty: true,
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

  readonly col = useColumnVisibility('partners-table', this.headerListPartners);

  readonly list = useEntityList<PartnerModel>({
    filtered$: this.partnersFacade.filteredPartners$.pipe(map((v) => v ?? [])),
    sort: (arr) => this.partnersService.sortPartnersById(arr),
    count: (arr) => this.partnersService.countPartners(arr),
  });

  readonly modalVisibleSig = toSignal(this.modalService.modalVisibility$, {
    initialValue: false,
  });

  // Año actual
  readonly currentYear = this.generalService.currentYear;

  // Enriquecidos a partir de la lista ordenada del hook
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

  readonly enrichedPartnersSig = computed(() => {
    const sorted = this.list.sortedSig();
    return sorted.map((p) => {
      const cuotas = normalizeCuotas(p.cuotas);
      const paidYears = cuotas.filter((c) => c.paid).map((c) => c.year);
      const years = paidYears.length;
      const lastCuotaPaid = paidYears.includes(this.currentYear);
      const lastPaidYear = years ? Math.max(...paidYears) : null;

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
        lastMethodPaid,
      } as PartnerModel & {
        years: number;
        lastCuotaPaid: boolean;
        lastPaidYear: number | null;
        lastMethodPaid: string;
      };
    });
  });

  // Recuento (del hook)
  readonly countPartnersSig = this.list.countSig;

  // Filtros
  filters: Filter[] = [];
  selectedFilter: number | null = null;

  // Modal
  item: PartnerModel | null = null;
  currentModalAction: TypeActionModal = TypeActionModal.Create;

  typeModal = TypeList.Partners;
  typeSection = TypeList.Partners;

  @ViewChild('printArea', { static: false })
  printArea!: ElementRef<HTMLElement>;

  // ──────────────────────────────────────────────────────────────────────────────
  // Lifecycle
  // ──────────────────────────────────────────────────────────────────────────────
  ngOnInit(): void {
    this.filters = [
      { code: '', name: 'Histórico' },
      ...this.generalService.getYearFilters(1995, this.currentYear),
    ];

    // Filtro por año inicial
    this.filterSelected(this.currentYear.toString());
  }

  // ──────────────────────────────────────────────────────────────────────────────
  // Filtros / búsqueda
  // ──────────────────────────────────────────────────────────────────────────────
  filterSelected(filter: string): void {
    this.selectedFilter = filter === '' ? null : Number(filter);

    this.partnersFacade.applyFilterWord('');

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

    // limpiar seleccionado SOLO en Create
    if (typeModal === TypeList.Partners && action === TypeActionModal.Create) {
      this.partnersFacade.clearSelectedPartner();
    }

    this.modalService.openModal();
  }

  onCloseModal(): void {
    this.modalService.closeModal();
    this.item = null;
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
