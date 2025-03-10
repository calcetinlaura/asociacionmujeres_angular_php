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
import { CreditorModel } from 'src/app/core/interfaces/creditor.interface';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { SpinnerLoadingComponent } from '../../../landing/components/spinner-loading/spinner-loading.component';

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
  creditors: CreditorModel[] = [];
  filteredCreditors: CreditorModel[] = [];
  searchForm!: FormGroup;
  dataLoaded: boolean = false;
  number: number = 0;
  headerListCreditors: ColumnModel[] = [];
  isModalVisible: boolean = false;
  currentModalAction: TypeActionModal = TypeActionModal.Create;
  item: any;
  searchKeywordFilter = new FormControl();
  isStickyToolbar: boolean = false;

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
          this.updateCreditorState(creditors);
        })
      )
      .subscribe();
  }

  applyFilter(keyword: string): void {
    if (!keyword) {
      this.filteredCreditors = this.creditors; // Si no hay palabra clave, mostrar todos los libros
    } else {
      keyword = keyword.toLowerCase();
      this.filteredCreditors = this.creditors.filter(
        (creditor) =>
          Object.values(creditor).join(' ').toLowerCase().includes(keyword) // Filtrar libros por la palabra clave
      );
    }
    this.number = this.filteredCreditors.length; // Actualizar el conteo de libros filtrados
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
    if (event.itemId) {
      this.creditorsFacade
        .editCreditor(event.itemId, event.newCreditorData)
        .pipe(
          takeUntilDestroyed(this.destroyRef),
          tap(() => {
            this.onCloseModal();
          })
        )
        .subscribe();
    } else {
      this.creditorsFacade
        .addCreditor(event.newCreditorData)
        .pipe(
          takeUntilDestroyed(this.destroyRef),
          tap(() => {
            this.onCloseModal();
          })
        )
        .subscribe();
    }
  }

  private updateCreditorState(creditors: CreditorModel[] | null): void {
    if (creditors === null) {
      return;
    }
    this.creditors = creditors.sort((a, b) =>
      a.company.localeCompare(b.company, undefined, { sensitivity: 'base' })
    );
    this.filteredCreditors = [...this.creditors];
    this.number = this.creditors.length;
    this.dataLoaded = true;
  }
}
