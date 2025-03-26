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
import { TypeActionModal, TypeList } from 'src/app/core/models/general.model';
import { ColumnModel } from 'src/app/core/interfaces/column.interface';
import { TableComponent } from 'src/app/modules/dashboard/components/table/table.component';
import { ModalComponent } from 'src/app/shared/components/modal/modal.component';
import { CommonModule } from '@angular/common';
import { CreditorsFacade } from 'src/app/application';
import { FormControl, FormGroup, ReactiveFormsModule } from '@angular/forms';
import { ModalService } from 'src/app/shared/components/modal/services/modal.service';
import { tap } from 'rxjs';
import { AddButtonComponent } from 'src/app/shared/components/buttons/button-add/button-add.component';
import { InputSearchComponent } from 'src/app/shared/components/inputs/input-search/input-search.component';
import {
  CreditorModel,
  CreditorWithInvoices,
  FilterCreditors,
} from 'src/app/core/interfaces/creditor.interface';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { SpinnerLoadingComponent } from '../../../landing/components/spinner-loading/spinner-loading.component';
import { FiltersComponent } from '../../../landing/components/filters/filters.component';

@Component({
  selector: 'app-creditors-page',
  standalone: true,
  imports: [
    CommonModule,
    DashboardHeaderComponent,
    TableComponent,
    ModalComponent,
    AddButtonComponent,
    ReactiveFormsModule,
    InputSearchComponent,
    FiltersComponent,
    SpinnerLoadingComponent,
  ],
  templateUrl: './creditors-page.component.html',
  styleUrl: './creditors-page.component.css',
})
export class CreditorsPageComponent implements OnInit {
  private creditorsFacade = inject(CreditorsFacade);
  private modalService = inject(ModalService);
  private destroyRef = inject(DestroyRef);

  typeList = TypeList.Creditors;
  creditors: CreditorWithInvoices[] = [];
  filteredCreditors: CreditorWithInvoices[] = [];
  filtersCategory = FilterCreditors;
  searchForm!: FormGroup;
  dataLoaded: boolean = false;
  number: number = 0;
  headerListCreditors: ColumnModel[] = [];
  isModalVisible: boolean = false;
  currentModalAction: TypeActionModal = TypeActionModal.Create;
  item: any;
  searchKeywordFilter = new FormControl();
  isStickyToolbar: boolean = false;
  selectedFilterCategory: string | null = null;

  @ViewChild('toolbar') toolbar!: ElementRef;

  @HostListener('window:scroll', [])
  onWindowScroll() {
    this.isStickyToolbar = window.scrollY > 50;
  }

  ngOnInit(): void {
    this.filtersCategory.unshift({ code: '', name: 'Todos' });
    this.loadAllCreditors();

    this.modalService.modalVisibility$
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        tap((isVisible) => {
          this.isModalVisible = isVisible;
        })
      )
      .subscribe();

    this.headerListCreditors = [
      { title: 'Compañía', key: 'company' },
      { title: 'Cif', key: 'cif' },
      { title: 'Contacto', key: 'contact' },
      { title: 'Teléfono', key: 'phone' },
      { title: 'Email', key: 'email' },
      { title: 'Municipio', key: 'town' },
      { title: 'Nº Facturas', key: 'numInvoices' },
      { title: 'Categoría', key: 'category' },
      { title: 'Palabras clave', key: 'key_words' },
    ];
  }

  loadAllCreditors(): void {
    this.creditorsFacade.loadAllCreditors();
    this.creditorsFacade.creditors$
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        tap((creditors) => {
          console.log('LISTA', creditors);
          if (creditors && creditors !== this.creditors) {
            // ✅ Evita recursión infinita
            this.updateCreditorState(creditors);
            this.creditorsFacade.loadInvoiceCounts(creditors);
          }
        })
      )
      .subscribe();
  }

  filterCategorySelected(filter: string): void {
    if (!filter) {
      this.selectedFilterCategory = null;
      this.filteredCreditors = [...(this.creditors || [])]; // 🔴 CORREGIDO: Evita errores si `this.creditors` es `null`
    } else {
      this.selectedFilterCategory = filter;
      this.filteredCreditors = (this.creditors || []).filter(
        (creditor) => creditor.category?.toLowerCase() === filter.toLowerCase()
      );
    }
    this.number = this.filteredCreditors.length;
  }

  applyFilter(keyword: string): void {
    if (!keyword) {
      this.filteredCreditors = this.creditors || [];
    } else {
      keyword = keyword.toLowerCase();
      this.filteredCreditors = (this.creditors || []).filter((creditor) =>
        Object.values(creditor)
          .filter((value) => typeof value === 'string') // 🔴 CORREGIDO: Evita valores `null` o `undefined`
          .some((value) => (value as string).toLowerCase().includes(keyword))
      );
    }
    this.number = this.filteredCreditors.length;
  }

  confirmDeleteCreditor(item: any): void {
    this.creditorsFacade.deleteCreditor(item.id);
    this.modalService.closeModal();
  }

  addNewCreditorModal(): void {
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
        tap(() => {
          this.onCloseModal();
        })
      )
      .subscribe();
  }

  private updateCreditorState(creditors: CreditorWithInvoices[] | null): void {
    if (!creditors) return;
    this.creditors = creditors.sort((a, b) =>
      a.company.localeCompare(b.company, undefined, { sensitivity: 'base' })
    );
    this.filteredCreditors = [...this.creditors];
    this.number = this.creditors.length;
    this.dataLoaded = true;
  }
}
