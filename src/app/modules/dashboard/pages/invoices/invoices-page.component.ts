import { CommonModule } from '@angular/common';
import { Component, DestroyRef, inject, OnInit } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormControl, FormGroup, ReactiveFormsModule } from '@angular/forms';
import { MatTabChangeEvent, MatTabsModule } from '@angular/material/tabs';
import { combineLatest, tap } from 'rxjs';
import { InvoicesFacade } from 'src/app/application/invoices.facade';
import { InvoiceModelFullData } from 'src/app/core/interfaces/invoice.interface';
import {
  Filter,
  TypeActionModal,
  TypeList,
} from 'src/app/core/models/general.model';
import { InvoicesService } from 'src/app/core/services/invoices.services';
import { DashboardHeaderComponent } from 'src/app/modules/dashboard/components/dashboard-header/dashboard-header.component';
import { FiltersComponent } from 'src/app/modules/landing/components/filters/filters.component';
import { AddButtonComponent } from 'src/app/shared/components/buttons/button-add/button-add.component';
import { InputSearchComponent } from 'src/app/shared/components/inputs/input-search/input-search.component';
import { ModalComponent } from 'src/app/shared/components/modal/modal.component';
import { ModalService } from 'src/app/shared/components/modal/services/modal.service';
import { SpinnerLoadingComponent } from 'src/app/shared/components/spinner-loading/spinner-loading.component';
import { GeneralService } from 'src/app/shared/services/generalService.service';
import { TableInvoicesComponent } from './components/table-invoices/table-invoices.component';

@Component({
  selector: 'app-invoices-page',
  standalone: true,
  imports: [
    CommonModule,
    DashboardHeaderComponent,
    ModalComponent,
    AddButtonComponent,
    ReactiveFormsModule,
    InputSearchComponent,
    TableInvoicesComponent,
    FiltersComponent,
    MatTabsModule,
    SpinnerLoadingComponent,
  ],
  providers: [InvoicesService],
  templateUrl: './invoices-page.component.html',
  styleUrl: './invoices-page.component.css',
})
export class InvoicesPageComponent implements OnInit {
  private invoicesFacade = inject(InvoicesFacade);
  private modalService = inject(ModalService);
  private destroyRef = inject(DestroyRef);
  private generalService = inject(GeneralService);

  selectedIndex: number = 0;
  selectedTypeFilter: string | null = null;
  typeList = TypeList.Invoices;
  invoices: InvoiceModelFullData[] = [];
  filtersYears: Filter[] = [];
  filteredInvoices: InvoiceModelFullData[] = [];
  currentFilterType: string | null = null;
  currentTab: string | null = null;
  searchForm!: FormGroup;
  dataLoaded: boolean = false;
  number: number = 0;
  isModalVisible: boolean = false;
  currentModalAction: TypeActionModal = TypeActionModal.Create;
  item: any;
  searchKeywordFilter = new FormControl();
  isStickyToolbar: boolean = false;
  selectedFilter: number | null = null;
  currentYear = this.generalService.currentYear;

  ngOnInit(): void {
    (this.filtersYears = this.generalService.getYearFilters(
      2018,
      this.currentYear
    )),
      this.loadInvoicesByYears(this.selectedFilter ?? this.currentYear);

    // combinar ambos para simplificar y evitar doble carga innecesaria. Suscribirse a los cambios en las facturas filtradas
    combineLatest([
      this.invoicesFacade.filteredInvoices$,
      this.invoicesFacade.invoices$,
    ])
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        tap(([filtered, all]) => {
          if (filtered) {
            this.filteredInvoices = filtered;
            this.number = filtered.length;
          } else if (all) {
            this.filteredInvoices = all;
            this.number = all.length;
          }
          this.dataLoaded = true;
        })
      )
      .subscribe();

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

  loadInvoicesByYears(filter: number): void {
    this.invoicesFacade.loadInvoicesByYears(filter);
    this.invoicesFacade.invoices$
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        tap((invoices) => {
          this.update_invoiceState(invoices);
        })
      )
      .subscribe();
  }

  filterYearSelected(filter: string): void {
    const year = parseInt(filter, 10); // convertir a número
    this.selectedFilter = year;
    this.invoicesFacade.loadInvoicesByYears(year);
    this.invoicesFacade.invoices$
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        tap((invoices) => {
          if (invoices === null) {
            this.invoices = [];
            this.filteredInvoices = [];
            this.number = 0;
          } else {
            this.invoices = invoices;
            this.filteredInvoices = invoices;
            this.number = invoices.length;
          }
          this.dataLoaded = true;
        })
      )
      .subscribe();
  }

  tabActive(event: MatTabChangeEvent): void {
    this.currentTab = event.tab.textLabel;

    switch (this.currentTab) {
      case 'Facturas':
        this.currentFilterType = 'Factura';
        break;
      case 'Tickets':
        this.currentFilterType = 'Ticket';
        break;
      case 'Ingresos':
        this.currentFilterType = 'Ingreso';
        break;
      case 'Contabilidad completa':
        this.currentFilterType = null; // Deja el tipo de filtro en null
        break;
      default:
        this.currentFilterType = null;
        break;
    }

    if (this.currentFilterType !== null) {
      this.invoicesFacade.applyFilterWordTab(this.currentFilterType);
    } else {
      this.clearFilter();
    }
  }

  applyFilterWord(keyword: string): void {
    this.invoicesFacade.applyFilterWord(keyword);
  }

  clearFilter(): void {
    this.currentFilterType = null;
    this.filteredInvoices = this.invoices;
  }

  confirmDeleteInvoice(item: any): void {
    this.invoicesFacade.deleteInvoice(item.id);
    this.modalService.closeModal();
  }

  addNewInvoiceModal(): void {
    this.currentModalAction = TypeActionModal.Create;
    this.item = null;
    this.modalService.openModal();
  }

  onOpenModal(event: { action: TypeActionModal; item: any }): void {
    this.currentModalAction = event.action;
    this.item = event.item;
    this.modalService.openModal();
  }

  onCloseModal(): void {
    this.modalService.closeModal();
  }

  sendFormInvoice(event: { itemId: number; formData: FormData }): void {
    if (event.itemId) {
      this.invoicesFacade
        .editInvoice(event.itemId, event.formData)
        .pipe(
          takeUntilDestroyed(this.destroyRef),
          tap(() => {
            this.loadInvoicesByYears(this.selectedFilter ?? this.currentYear);
            this.invoicesFacade.applyFilterWordTab(this.currentFilterType);
            this.onCloseModal(); // ✅ ahora también cierra al editar
          })
        )
        .subscribe();
    } else {
      this.invoicesFacade
        .addInvoice(event.formData)
        .pipe(
          takeUntilDestroyed(this.destroyRef),
          tap(() => {
            this.loadInvoicesByYears(this.selectedFilter ?? this.currentYear);
            this.invoicesFacade.applyFilterWordTab(this.currentFilterType);
            this.onCloseModal();
          })
        )
        .subscribe();
    }
  }

  private update_invoiceState(invoices: InvoiceModelFullData[] | null): void {
    if (invoices === null) {
      return;
    }
    this.invoices = invoices.sort((a, b) => b.id - a.id);
    this.filteredInvoices = [...this.invoices];
    this.number = this.invoices.length;
    this.dataLoaded = true;
  }
}
