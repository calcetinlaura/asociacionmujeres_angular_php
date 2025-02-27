import {
  Component,
  DestroyRef,
  ElementRef,
  HostListener,
  inject,
  OnInit,
  ViewChild,
} from '@angular/core';
import { DashboardHeaderComponent } from 'src/app/modules/dashboard/components/dashboard-header/dashboard-header.component';
import {
  Filter,
  TypeActionModal,
  TypeList,
} from 'src/app/core/models/general.model';
import { InvoicesService } from 'src/app/core/services/invoices.services';
import { ModalComponent } from 'src/app/shared/components/modal/modal.component';
import { CommonModule } from '@angular/common';
import { InvoicesFacade } from 'src/app/application';
import { FormControl, FormGroup, ReactiveFormsModule } from '@angular/forms';
import { ModalService } from 'src/app/shared/components/modal/services/modal.service';
import { tap } from 'rxjs';
import { AddButtonComponent } from 'src/app/shared/components/buttons/button-add/button-add.component';
import { InputSearchComponent } from 'src/app/shared/components/inputs/input-search/input-search.component';
import { TableInvoicesComponent } from './components/table-invoices/table-invoices.component';
import { FiltersComponent } from 'src/app/modules/landing/components/filters/filters.component';
import { MatTabChangeEvent, MatTabsModule } from '@angular/material/tabs';
import { InvoiceModel } from 'src/app/core/interfaces/invoice.interface';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { SpinnerLoadingComponent } from '../../../landing/components/spinner-loading/spinner-loading.component';
import { GeneralService } from 'src/app/shared/services/generalService.service';
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
  invoices: InvoiceModel[] = [];
  filtersYears: Filter[] = [];
  filteredInvoices: InvoiceModel[] = [];
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
  selectedFilterYear: string = new Date().getFullYear().toString();

  @ViewChild('toolbar') toolbar!: ElementRef;

  @HostListener('window:scroll', [])
  onWindowScroll() {
    const scrollPosition =
      window.scrollY ||
      document.documentElement.scrollTop ||
      document.body.scrollTop ||
      0;

    if (scrollPosition > 50) {
      this.isStickyToolbar = true;
    } else {
      this.isStickyToolbar = false;
    }
  }
  ngOnInit(): void {
    const currentYear = this.generalService.currentYear;
    const startYear = 2018;

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

    // Invertir el array para que el último año esté primero
    this.filtersYears.reverse();
    this.loadInvoicesByYears(this.selectedFilterYear);
    //this.loadInvoices();

    // Suscribirse a los cambios en las facturas filtradas
    this.invoicesFacade.filteredInvoices$
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        tap((invoices) => {
          if (invoices === null) {
            return;
          }
          this.filteredInvoices = invoices;
          this.number = invoices.length; // Actualiza el número de facturas
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
  loadInvoicesByYears(filter: string): void {
    this.invoicesFacade.loadInvoicesByYears(filter);
    this.invoicesFacade.invoices$
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        tap((invoices) => {
          this.invoices = invoices;
          this.filteredInvoices = invoices;
          this.number = this.invoices.length;
          this.dataLoaded = true;
        })
      )
      .subscribe();
  }

  filterYearSelected(filter: string): void {
    this.selectedFilterYear = filter;
    this.loadInvoicesByYears(filter);
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
      this.invoicesFacade.applyFilterTab(this.currentFilterType);
    } else {
      this.clearFilter();
    }
  }

  applyFiltersWords(keyword: string): void {
    this.invoicesFacade.applyFiltersWords(keyword);
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

  sendFormInvoice(event: {
    itemId: number;
    newInvoiceData: InvoiceModel;
  }): void {
    if (event.itemId) {
      this.invoicesFacade.editInvoice(event.itemId, event.newInvoiceData);
      // Después de editar, recarga las facturas y aplica el filtro
      this.loadInvoicesByYears(this.selectedFilterYear);
      this.invoicesFacade.applyFilterTab(this.currentFilterType); // Aplicar el filtro actual
    } else {
      this.invoicesFacade
        .addInvoice(event.newInvoiceData)
        .pipe(
          takeUntilDestroyed(this.destroyRef),
          tap(() => {
            this.loadInvoicesByYears(this.selectedFilterYear);
            this.invoicesFacade.applyFilterTab(this.currentFilterType);
            this.onCloseModal();
          })
        )
        .subscribe();
    }
    this.onCloseModal();
  }
}
