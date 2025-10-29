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
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatMenuModule } from '@angular/material/menu';
import { map } from 'rxjs';

import { CreditorsFacade } from 'src/app/application/creditors.facade';
import { FiltersFacade } from 'src/app/application/filters.facade';
import { ModalFacade } from 'src/app/application/modal.facade';

import {
  ColumnModel,
  ColumnWidth,
} from 'src/app/core/interfaces/column.interface';
import { CreditorWithInvoices } from 'src/app/core/interfaces/creditor.interface';
import { InvoiceModelFullData } from 'src/app/core/interfaces/invoice.interface';
import { TypeActionModal, TypeList } from 'src/app/core/models/general.model';

import { CreditorsService } from 'src/app/core/services/creditors.services';
import { InvoicesService } from 'src/app/core/services/invoices.services';
import { PdfPrintService } from 'src/app/core/services/PdfPrintService.service';

import { DashboardHeaderComponent } from 'src/app/shared/components/dashboard-header/dashboard-header.component';
import { FiltersComponent } from 'src/app/shared/components/filters/filters.component';
import { ModalShellComponent } from 'src/app/shared/components/modal/modal-shell.component';
import { PageToolbarComponent } from 'src/app/shared/components/page-toolbar/page-toolbar.component';
import { SpinnerLoadingComponent } from 'src/app/shared/components/spinner-loading/spinner-loading.component';
import { StickyZoneComponent } from 'src/app/shared/components/sticky-zone/sticky-zone.component';
import { TableComponent } from 'src/app/shared/components/table/table.component';
import { useColumnVisibility } from 'src/app/shared/hooks/use-column-visibility';
import { useEntityList } from 'src/app/shared/hooks/use-entity-list';

type CreditorsModalItem = CreditorWithInvoices | InvoiceModelFullData;

@Component({
  selector: 'app-creditors-page',
  standalone: true,
  imports: [
    DashboardHeaderComponent,
    SpinnerLoadingComponent,
    StickyZoneComponent,
    TableComponent,
    FiltersComponent,
    ModalShellComponent,
    PageToolbarComponent,
    CommonModule,
    MatMenuModule,
    MatCheckboxModule,
  ],
  templateUrl: './creditors-page.component.html',
})
export class CreditorsPageComponent implements OnInit {
  private readonly destroyRef = inject(DestroyRef);
  private readonly pdfPrintService = inject(PdfPrintService);
  private readonly creditorsService = inject(CreditorsService);
  private readonly invoicesService = inject(InvoicesService);
  readonly creditorsFacade = inject(CreditorsFacade);
  private readonly modalFacade = inject(ModalFacade);
  readonly filtersFacade = inject(FiltersFacade);

  // ✅ Toolbar (para limpiar buscador)
  @ViewChild(PageToolbarComponent)
  private toolbarComponent!: PageToolbarComponent;

  // ────────────────────────────────────────────────
  // Columnas
  // ────────────────────────────────────────────────
  headerListCreditors: ColumnModel[] = [
    { title: 'Compañía', key: 'company', sortable: true },
    {
      title: 'CIF',
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
      title: 'Municipio',
      key: 'town',
      showIndicatorOnEmpty: true,
      sortable: true,
      width: ColumnWidth.MD,
    },
    {
      title: 'Nº Facturas',
      key: 'invoices',
      sortable: true,
      width: ColumnWidth.XS,
      showLengthOnly: true,
      textAlign: 'center',
    },
    {
      title: 'Categoría',
      key: 'category',
      sortable: true,
      backColor: true,
      width: ColumnWidth.SM,
      pipe: 'filterTransformCode',
      pipeArg: 'categoryCreditors',
    },
    {
      title: 'Palabras clave',
      key: 'key_words',
      sortable: true,
      width: ColumnWidth.MD,
    },
  ];

  readonly col = useColumnVisibility(
    'creditors-table',
    this.headerListCreditors
  );

  // ────────────────────────────────────────────────
  // Lista reactiva
  // ────────────────────────────────────────────────
  readonly list = useEntityList<CreditorWithInvoices>({
    filtered$: this.creditorsFacade.filteredCreditors$.pipe(
      map((v) => v ?? [])
    ),
    sort: (arr) => this.creditorsService.sortCreditorsById(arr),
    count: (arr) => this.creditorsService.countCreditors(arr),
  });
  readonly TypeList = TypeList;
  readonly hasRowsSig = computed(() => this.list.countSig() > 0);

  // ────────────────────────────────────────────────
  // Modal controlado por ModalFacade
  // ────────────────────────────────────────────────
  readonly modalVisibleSig = this.modalFacade.isVisibleSig;
  readonly currentModalTypeSig = this.modalFacade.typeSig;
  readonly currentModalActionSig = this.modalFacade.actionSig;
  readonly currentItemSig = this.modalFacade.itemSig;

  // Ref impresión
  @ViewChild('printArea', { static: false })
  printArea!: ElementRef<HTMLElement>;

  // ────────────────────────────────────────────────
  // Lifecycle
  // ────────────────────────────────────────────────
  ngOnInit(): void {
    //  Cargamos filtros globales para acreedores
    this.filtersFacade.loadFiltersFor(TypeList.Creditors);
  }

  ngAfterViewInit(): void {
    // Se aplica filtro inicial “Todos”
    setTimeout(() => this.filterSelected(''));
  }

  // ────────────────────────────────────────────────
  // Filtros / búsqueda
  // ────────────────────────────────────────────────
  filterSelected(filter: string): void {
    this.filtersFacade.selectFilter(filter);

    if (this.toolbarComponent) {
      this.toolbarComponent.clearSearch();
    }

    if (!filter) {
      this.creditorsFacade.loadAllCreditors();
    } else {
      this.creditorsFacade.loadCreditorsByFilter(filter);
    }
  }

  applyFilterWord(keyword: string): void {
    this.filtersFacade.setSearch(keyword);
    this.creditorsFacade.applyFilterWord(keyword);
  }

  // ────────────────────────────────────────────────
  // Modal + CRUD
  // ────────────────────────────────────────────────
  addNewCreditorModal(): void {
    this.creditorsFacade.clearSelectedCreditor();
    this.modalFacade.open(TypeList.Creditors, TypeActionModal.Create, null);
  }

  onOpenModal(event: {
    typeModal: TypeList;
    action: TypeActionModal;
    item?: CreditorsModalItem;
  }): void {
    this.modalFacade.open(event.typeModal, event.action, event.item ?? null);
  }

  onCloseModal(): void {
    this.modalFacade.close();
  }

  onBackModal(): void {
    this.modalFacade.back();
  }

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
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(() => this.modalFacade.close());
  }

  onOpenInvoice(invoiceId: number): void {
    this.invoicesService
      .getInvoiceById(invoiceId)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (invoice) =>
          this.modalFacade.open(
            TypeList.Invoices,
            TypeActionModal.Show,
            invoice
          ),
        error: (err) => console.error('Error cargando factura', err),
      });
  }

  // ────────────────────────────────────────────────
  // Impresión
  // ────────────────────────────────────────────────
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
}
