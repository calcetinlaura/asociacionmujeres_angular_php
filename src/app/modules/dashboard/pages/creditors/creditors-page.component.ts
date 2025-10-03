import { CommonModule } from '@angular/common';
import {
  Component,
  computed,
  DestroyRef,
  ElementRef,
  inject,
  OnInit,
  Signal,
  ViewChild,
  WritableSignal,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormGroup, ReactiveFormsModule } from '@angular/forms';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatMenuModule } from '@angular/material/menu';
import { tap } from 'rxjs';

import { CreditorsFacade } from 'src/app/application/creditors.facade';
import {
  ColumnModel,
  ColumnWidth,
} from 'src/app/core/interfaces/column.interface';
import {
  categoryFilterCreditors,
  CreditorWithInvoices,
} from 'src/app/core/interfaces/creditor.interface';
import { InvoiceModelFullData } from 'src/app/core/interfaces/invoice.interface'; // 👈 asegúrate de la ruta
import {
  Filter,
  TypeActionModal,
  TypeList,
} from 'src/app/core/models/general.model';

import { CreditorsService } from 'src/app/core/services/creditors.services';
import { InvoicesService } from 'src/app/core/services/invoices.services'; // 👈 servicio de facturas
import { DashboardHeaderComponent } from 'src/app/modules/dashboard/components/dashboard-header/dashboard-header.component';
import { TableComponent } from 'src/app/modules/dashboard/components/table/table.component';
import { FiltersComponent } from 'src/app/modules/landing/components/filters/filters.component';
import { ButtonIconComponent } from 'src/app/shared/components/buttons/button-icon/button-icon.component';
import { IconActionComponent } from 'src/app/shared/components/buttons/icon-action/icon-action.component';
import { InputSearchComponent } from 'src/app/shared/components/inputs/input-search/input-search.component';
import { SpinnerLoadingComponent } from 'src/app/shared/components/spinner-loading/spinner-loading.component';
import { GeneralService } from 'src/app/shared/services/generalService.service';
import { PdfPrintService } from 'src/app/shared/services/PdfPrintService.service';

import { StickyZoneComponent } from '../../components/sticky-zone/sticky-zone.component';
import { ColumnMenuComponent } from '../../components/table/column-menu.component';
import { ColumnVisibilityStore } from '../../components/table/column-visibility.store';

import { ModalShellComponent } from 'src/app/shared/components/modal/modal-shell.component';
import { ModalNavService } from 'src/app/shared/components/modal/services/modal-nav.service';
import { ModalService } from 'src/app/shared/components/modal/services/modal.service';

type CreditorsModalItem = CreditorWithInvoices | InvoiceModelFullData;

@Component({
  selector: 'app-creditors-page',
  standalone: true,
  imports: [
    // UI
    DashboardHeaderComponent,
    SpinnerLoadingComponent,
    StickyZoneComponent,
    TableComponent,
    FiltersComponent,
    ButtonIconComponent,
    IconActionComponent,
    InputSearchComponent,
    ColumnMenuComponent,
    ModalShellComponent,
    // Angular
    CommonModule,
    ReactiveFormsModule,
    MatMenuModule,
    MatCheckboxModule,
  ],
  templateUrl: './creditors-page.component.html',
})
export class CreditorsPageComponent implements OnInit {
  // Servicios
  private readonly destroyRef = inject(DestroyRef);
  private readonly modalService = inject(ModalService);
  private readonly generalService = inject(GeneralService);
  private readonly pdfPrintService = inject(PdfPrintService);
  private readonly colStore = inject(ColumnVisibilityStore);

  readonly creditorsFacade = inject(CreditorsFacade);
  private readonly creditorsService = inject(CreditorsService);
  private readonly invoicesService = inject(InvoicesService);

  // Navegación modal (stack para volver)
  private readonly modalNav = inject(ModalNavService<CreditorsModalItem>);

  // Tabla
  headerListCreditors: ColumnModel[] = [
    { title: 'Compañía', key: 'company', sortable: true },
    {
      title: 'Cif',
      key: 'cif',
      sortable: true,
      showIndicatorOnEmpty: true,
      width: ColumnWidth.SM,
      textAlign: 'center',
    },
    {
      title: 'Contacto',
      key: 'contact',
      sortable: true,
      showIndicatorOnEmpty: true,
    },
    {
      title: 'Teléfono',
      key: 'phone',
      sortable: true,
      showIndicatorOnEmpty: true,
      width: ColumnWidth.SM,
      pipe: 'phoneFormat',
    },
    {
      title: 'Email',
      key: 'email',
      sortable: true,
      showIndicatorOnEmpty: true,
      width: ColumnWidth.LG,
    },
    { title: 'Municipio', key: 'town', sortable: true },
    {
      title: 'Nº Facturas',
      key: 'invoices',
      sortable: true,
      width: ColumnWidth.XS,
      showLengthOnly: true,
    },
    {
      title: 'Categoría',
      key: 'category',
      sortable: true,
      backColor: true,
      width: ColumnWidth.SM,
    },
    {
      title: 'Palabras clave',
      key: 'key_words',
      sortable: true,
      width: ColumnWidth.SM,
    },
  ];

  // Signals para columnas
  columnVisSig!: WritableSignal<Record<string, boolean>>;
  displayedColumnsSig!: Signal<string[]>;

  // Datos
  creditors: CreditorWithInvoices[] = [];
  filteredCreditors: CreditorWithInvoices[] = [];
  filters: Filter[] = [];
  selectedFilter: string | null = null;

  isModalVisible = false;
  number = 0;

  // Modal
  item: CreditorsModalItem | null = null;
  currentModalAction: TypeActionModal = TypeActionModal.Create;
  typeModal: TypeList = TypeList.Creditors;
  typeSection: TypeList = TypeList.Creditors;

  // Form
  searchForm!: FormGroup;

  // Refs
  @ViewChild(InputSearchComponent)
  private inputSearchComponent!: InputSearchComponent;

  @ViewChild('printArea', { static: false })
  printArea!: ElementRef<HTMLElement>;

  // ──────────────────────────────────────────────────────────────────────────────
  // Lifecycle
  // ──────────────────────────────────────────────────────────────────────────────
  ngOnInit(): void {
    // Persistencia de columnas con Signals
    this.columnVisSig = this.colStore.init(
      'creditors-table',
      this.headerListCreditors,
      [] // ocultas por defecto
    );
    this.displayedColumnsSig = computed(() =>
      this.colStore.displayedColumns(
        this.headerListCreditors,
        this.columnVisSig()
      )
    );

    // Filtros
    this.filters = [{ code: '', name: 'Todos' }, ...categoryFilterCreditors];

    // Visibilidad modal
    this.modalService.modalVisibility$
      .pipe(takeUntilDestroyed(this.destroyRef))
      .pipe(tap((isVisible) => (this.isModalVisible = isVisible)))
      .subscribe();

    // Carga inicial
    this.filterSelected('');

    // Estado desde facade
    this.creditorsFacade.filteredCreditors$
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        tap((creditors) => this.updateCreditorState(creditors))
      )
      .subscribe();
  }

  // ──────────────────────────────────────────────────────────────────────────────
  // Filtros / búsqueda
  // ──────────────────────────────────────────────────────────────────────────────
  filterSelected(filter: string): void {
    this.selectedFilter = filter;
    this.generalService.clearSearchInput(this.inputSearchComponent);

    if (!filter) {
      this.creditorsFacade.loadAllCreditors();
    } else {
      this.creditorsFacade.loadCreditorsByFilter(filter);
    }
  }

  applyFilterWord(keyword: string): void {
    this.creditorsFacade.applyFilterWord(keyword);
  }

  // ──────────────────────────────────────────────────────────────────────────────
  // Modal + navegación
  // ──────────────────────────────────────────────────────────────────────────────
  addNewCreditorModal(): void {
    this.openModal(TypeList.Creditors, TypeActionModal.Create, null);
  }

  onOpenModal(event: {
    typeModal: TypeList;
    action: TypeActionModal;
    item?: CreditorWithInvoices;
  }): void {
    this.openModal(event.typeModal, event.action, event.item ?? null);
  }

  private openModal(
    typeModal: TypeList,
    action: TypeActionModal,
    item: CreditorsModalItem | null
  ): void {
    this.currentModalAction = action;
    this.item = item;
    this.typeModal = typeModal;

    // Limpiar seleccionado SOLO en CREATE de acreedores
    if (typeModal === TypeList.Creditors && action === TypeActionModal.Create) {
      this.creditorsFacade.clearSelectedCreditor();
    }

    this.modalService.openModal();
  }

  onCloseModal(): void {
    this.modalService.closeModal();
    this.item = null;
    this.modalNav.clear(); // reset navegación
  }

  // Abrir FACTURA desde la modal de acreedor
  onOpenInvoice(invoiceId: number): void {
    // Guarda estado actual para "volver"
    this.modalNav.push({
      typeModal: this.typeModal,
      action: this.currentModalAction,
      item: this.item,
    });

    this.invoicesService
      .getInvoiceById(invoiceId)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (invoice: InvoiceModelFullData) => {
          this.openModal(TypeList.Invoices, TypeActionModal.Show, invoice);
        },
        error: (err) => console.error('Error cargando factura', err),
      });
  }

  onBackModal(): void {
    const prev = this.modalNav.pop();
    if (!prev) return;
    this.currentModalAction = prev.action;
    this.item = prev.item;
    this.typeModal = prev.typeModal;
  }

  // ──────────────────────────────────────────────────────────────────────────────
  // CRUD
  // ──────────────────────────────────────────────────────────────────────────────
  onDelete({ type, id }: { type: TypeList; id: number }) {
    const actions: Partial<Record<TypeList, (id: number) => void>> = {
      [TypeList.Creditors]: (x) => this.creditorsFacade.deleteCreditor(x),
    };
    actions[type]?.(id);
  }

  sendFormCreditor(event: { itemId: number; formData: FormData }): void {
    const request$ = event.itemId
      ? this.creditorsFacade.editCreditor(event.formData)
      : this.creditorsFacade.addCreditor(event.formData);

    request$
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        tap(() => this.onCloseModal())
      )
      .subscribe();
  }

  // ──────────────────────────────────────────────────────────────────────────────
  // Estado tabla
  // ──────────────────────────────────────────────────────────────────────────────
  private updateCreditorState(creditors: CreditorWithInvoices[] | null): void {
    if (!creditors) return;

    this.creditors = this.creditorsService.sortCreditorsById(creditors);
    this.filteredCreditors = [...this.creditors];
    this.number = this.creditorsService.countCreditors(creditors);
  }

  getVisibleColumns() {
    return this.colStore.visibleColumnModels(
      this.headerListCreditors,
      this.columnVisSig()
    );
  }

  toggleColumn(key: string): void {
    this.colStore.toggle('creditors-table', this.columnVisSig, key);
  }

  // ──────────────────────────────────────────────────────────────────────────────
  // Impresión
  // ──────────────────────────────────────────────────────────────────────────────
  async printTableAsPdf(): Promise<void> {
    if (!this.printArea) return;

    await this.pdfPrintService.printElementAsPdf(this.printArea, {
      filename: 'acreedores.pdf',
      preset: 'compact',
      orientation: 'portrait',
      format: 'a4',
      margins: [5, 5, 5, 5],
    });
  }

  // Para el template (botón volver del shell)
  get canGoBack(): boolean {
    return this.modalNav.canGoBack();
  }
}
