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
  CreditorModel,
  CreditorWithInvoices,
} from 'src/app/core/interfaces/creditor.interface';
import {
  Filter,
  TypeActionModal,
  TypeList,
} from 'src/app/core/models/general.model';
import { CreditorsService } from 'src/app/core/services/creditors.services';
import { DashboardHeaderComponent } from 'src/app/modules/dashboard/components/dashboard-header/dashboard-header.component';
import { TableComponent } from 'src/app/modules/dashboard/components/table/table.component';
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

@Component({
  selector: 'app-creditors-page',
  imports: [
    DashboardHeaderComponent,
    ModalComponent,
    ButtonIconComponent,
    ReactiveFormsModule,
    InputSearchComponent,
    SpinnerLoadingComponent,
    TableComponent,
    FiltersComponent,
    IconActionComponent,
    ButtonComponent,
    MatMenuModule,
    MatCheckboxModule,
    CommonModule,
  ],
  templateUrl: './creditors-page.component.html',
  styleUrl: './creditors-page.component.css',
})
export class CreditorsPageComponent implements OnInit {
  private readonly destroyRef = inject(DestroyRef);
  private readonly modalService = inject(ModalService);
  private readonly creditorsFacade = inject(CreditorsFacade);
  private readonly creditorsService = inject(CreditorsService);
  private readonly generalService = inject(GeneralService);
  private readonly pdfPrintService = inject(PdfPrintService);

  creditors: CreditorWithInvoices[] = [];
  filteredCreditors: CreditorWithInvoices[] = [];
  filters: Filter[] = [];
  selectedFilter: string | null = null;

  isLoading = true;
  isModalVisible = false;
  number = 0;

  item: CreditorWithInvoices | null = null;
  currentModalAction: TypeActionModal = TypeActionModal.Create;
  searchForm!: FormGroup;
  typeModal = TypeList.Creditors;
  typeSection = TypeList.Creditors;
  columnVisibility: Record<string, boolean> = {};
  displayedColumns: string[] = [];
  headerListCreditors: ColumnModel[] = [
    { title: 'Compañía', key: 'company', sortable: true },
    {
      title: 'Cif',
      key: 'cif',
      sortable: true,
      showIndicatorOnEmpty: true,
      width: ColumnWidth.SM,
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
      width: ColumnWidth.XS,
    },
    {
      title: 'Palabras clave',
      key: 'key_words',
      sortable: true,
      width: ColumnWidth.SM,
    },
  ];

  @ViewChild(InputSearchComponent)
  private inputSearchComponent!: InputSearchComponent;

  ngOnInit(): void {
    this.filters = [{ code: 'ALL', name: 'Todos' }, ...categoryFilterCreditors];

    this.modalService.modalVisibility$
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        tap((isVisible) => (this.isModalVisible = isVisible))
      )
      .subscribe();

    this.filterSelected('ALL');

    this.creditorsFacade.filteredCreditors$
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        tap((creditors) => this.updateCreditorState(creditors))
      )
      .subscribe();
    this.columnVisibility = this.headerListCreditors.reduce(
      (acc, col) => ({ ...acc, [col.key]: true }),
      {}
    );
  }

  filterSelected(filter: string): void {
    this.selectedFilter = filter;
    this.generalService.clearSearchInput(this.inputSearchComponent);
    this.creditorsFacade.setCurrentFilter(filter);
  }

  applyFilterWord(keyword: string): void {
    this.creditorsFacade.applyFilterWord(keyword);
  }

  addNewCreditorModal(): void {
    this.openModal(this.typeModal, TypeActionModal.Create, null);
  }

  onOpenModal(event: {
    typeModal: TypeList;
    action: TypeActionModal;
    item: CreditorWithInvoices;
  }): void {
    this.openModal(event.typeModal, event.action, event.item);
  }

  private openModal(
    typeModal: TypeList,
    action: TypeActionModal,
    item: CreditorWithInvoices | null
  ): void {
    this.currentModalAction = action;
    this.item = item;
    this.typeModal = typeModal;
    this.modalService.openModal();
  }

  onCloseModal(): void {
    this.modalService.closeModal();
  }

  confirmDeleteCreditor(creditor: CreditorModel | null): void {
    if (!creditor) return;
    this.creditorsFacade.deleteCreditor(creditor.id);
    this.onCloseModal();
  }

  sendFormCreditor(event: {
    itemId: number;
    newCreditorData: CreditorModel;
  }): void {
    const request$ = event.itemId
      ? this.creditorsFacade.editCreditor(event.itemId, event.newCreditorData)
      : this.creditorsFacade.addCreditor(event.newCreditorData);

    request$
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        tap(() => this.onCloseModal())
      )
      .subscribe();
  }

  private updateCreditorState(creditors: CreditorWithInvoices[] | null): void {
    if (!creditors) return;

    this.creditors = this.creditorsService.sortCreditorsById(creditors);
    this.filteredCreditors = [...this.creditors];
    this.number = this.creditorsService.countCreditors(creditors);
    this.isLoading = false;
  }
  printTableAsPdf(): void {
    this.pdfPrintService.printTableAsPdf('table.mat-table', 'acreedores.pdf');
  }
  toggleColumn(key: string): void {
    this.columnVisibility[key] = !this.columnVisibility[key];
    this.updateDisplayedColumns();
  }

  private updateDisplayedColumns(): void {
    const base = ['number']; // si usas un número de fila
    const dynamic = this.headerListCreditors
      .filter((col) => this.columnVisibility[col.key])
      .map((col) => col.key);
    this.displayedColumns = [...base, ...dynamic, 'actions'];
  }
}
