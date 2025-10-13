import { CommonModule } from '@angular/common';
import {
  Component,
  DestroyRef,
  ElementRef,
  inject,
  OnInit,
  ViewChild,
} from '@angular/core';
import { takeUntilDestroyed, toSignal } from '@angular/core/rxjs-interop';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatMenuModule } from '@angular/material/menu';
import { map, tap } from 'rxjs';

import { CreditorsFacade } from 'src/app/application/creditors.facade';
import {
  ColumnModel,
  ColumnWidth,
} from 'src/app/core/interfaces/column.interface';
import {
  categoryFilterCreditors,
  CreditorWithInvoices,
} from 'src/app/core/interfaces/creditor.interface';
import { InvoiceModelFullData } from 'src/app/core/interfaces/invoice.interface';
import {
  Filter,
  TypeActionModal,
  TypeList,
} from 'src/app/core/models/general.model';

import { CreditorsService } from 'src/app/core/services/creditors.services';
import { InvoicesService } from 'src/app/core/services/invoices.services';
import { PdfPrintService } from 'src/app/shared/services/PdfPrintService.service';

import { DashboardHeaderComponent } from 'src/app/modules/dashboard/components/dashboard-header/dashboard-header.component';
import { TableComponent } from 'src/app/modules/dashboard/components/table/table.component';
import { FiltersComponent } from 'src/app/modules/landing/components/filters/filters.component';
import { ModalShellComponent } from 'src/app/shared/components/modal/modal-shell.component';
import { ModalNavService } from 'src/app/shared/components/modal/services/modal-nav.service';
import { ModalService } from 'src/app/shared/components/modal/services/modal.service';
import { SpinnerLoadingComponent } from 'src/app/shared/components/spinner-loading/spinner-loading.component';
import { StickyZoneComponent } from '../../components/sticky-zone/sticky-zone.component';

// hooks reutilizables
import { useColumnVisibility } from 'src/app/shared/hooks/use-column-visibility';
import { useEntityList } from 'src/app/shared/hooks/use-entity-list';
import { PageToolbarComponent } from '../../components/page-toolbar/page-toolbar.component';

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
    ModalShellComponent,
    PageToolbarComponent,
    // Angular
    CommonModule,
    MatMenuModule,
    MatCheckboxModule,
  ],
  templateUrl: './creditors-page.component.html',
})
export class CreditorsPageComponent implements OnInit {
  // servicios
  private readonly destroyRef = inject(DestroyRef);
  private readonly modalService = inject(ModalService);
  private readonly pdfPrintService = inject(PdfPrintService);
  private readonly creditorsService = inject(CreditorsService);
  private readonly invoicesService = inject(InvoicesService);
  readonly creditorsFacade = inject(CreditorsFacade);
  private readonly modalNav = inject(ModalNavService<CreditorsModalItem>);

  // tabla: definición columnas
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

  // ── Column visibility (hook)
  readonly col = useColumnVisibility(
    'creditors-table',
    this.headerListCreditors
  );

  readonly list = useEntityList<CreditorWithInvoices>({
    filtered$: this.creditorsFacade.filteredCreditors$.pipe(
      map((v) => v ?? [])
    ),
    sort: (arr) => this.creditorsService.sortCreditorsById(arr),
    count: (arr) => this.creditorsService.countCreditors(arr),
    // map: opcional si quisieras enriquecer cada fila antes del sort
  });

  // filtros
  filters: Filter[] = [];
  selectedFilter: string | null = null;

  // modal
  readonly modalVisibleSig = toSignal(this.modalService.modalVisibility$, {
    initialValue: false,
  });
  item: CreditorsModalItem | null = null;
  currentModalAction: TypeActionModal = TypeActionModal.Create;
  typeModal: TypeList = TypeList.Creditors;
  typeSection: TypeList = TypeList.Creditors;

  // refs
  @ViewChild('printArea', { static: false })
  printArea!: ElementRef<HTMLElement>;

  // ──────────────────────────────────────────────────────────────────────────────
  // lifecycle
  // ──────────────────────────────────────────────────────────────────────────────
  ngOnInit(): void {
    this.filters = [{ code: '', name: 'Todos' }, ...categoryFilterCreditors];
    // carga inicial
    this.filterSelected('');
  }

  // ──────────────────────────────────────────────────────────────────────────────
  // filtros / búsqueda
  // ──────────────────────────────────────────────────────────────────────────────
  filterSelected(filter: string): void {
    this.selectedFilter = filter;
    this.creditorsFacade.applyFilterWord('');

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
  // modal + navegación
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

    if (typeModal === TypeList.Creditors && action === TypeActionModal.Create) {
      this.creditorsFacade.clearSelectedCreditor();
    }

    this.modalService.openModal();
  }

  onCloseModal(): void {
    this.modalService.closeModal();
    this.item = null;
    this.modalNav.clear();
  }

  onOpenInvoice(invoiceId: number): void {
    // guardar estado actual para "volver"
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
  // impresión
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

  get canGoBack(): boolean {
    return this.modalNav.canGoBack();
  }
}
