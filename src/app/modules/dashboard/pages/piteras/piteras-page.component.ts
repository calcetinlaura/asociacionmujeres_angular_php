import { CommonModule } from '@angular/common';
import { Component, DestroyRef, inject, OnInit } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormGroup, ReactiveFormsModule } from '@angular/forms';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatMenuModule } from '@angular/material/menu';
import { tap } from 'rxjs';
import { PiterasFacade } from 'src/app/application/piteras.facade';
import {
  ColumnModel,
  ColumnWidth,
} from 'src/app/core/interfaces/column.interface';
import { PiteraModel } from 'src/app/core/interfaces/pitera.interface';
import { TypeActionModal, TypeList } from 'src/app/core/models/general.model';
import { PiterasService } from 'src/app/core/services/piteras.services';
import { DashboardHeaderComponent } from 'src/app/modules/dashboard/components/dashboard-header/dashboard-header.component';
import { TableComponent } from 'src/app/modules/dashboard/components/table/table.component';
import { ButtonIconComponent } from 'src/app/shared/components/buttons/button-icon/button-icon.component';
import { ButtonComponent } from 'src/app/shared/components/buttons/button/button.component';
import { IconActionComponent } from 'src/app/shared/components/buttons/icon-action/icon-action.component';
import { InputSearchComponent } from 'src/app/shared/components/inputs/input-search/input-search.component';
import { ModalComponent } from 'src/app/shared/components/modal/modal.component';
import { ModalService } from 'src/app/shared/components/modal/services/modal.service';
import { SpinnerLoadingComponent } from 'src/app/shared/components/spinner-loading/spinner-loading.component';
import { GeneralService } from 'src/app/shared/services/generalService.service';
import { PdfPrintService } from 'src/app/shared/services/PdfPrintService.service';
import { StickyZoneComponent } from '../../components/sticky-zone/sticky-zone.component';

@Component({
  selector: 'app-piteras-page',
  imports: [
    DashboardHeaderComponent,
    ModalComponent,
    ButtonIconComponent,
    ReactiveFormsModule,
    InputSearchComponent,
    SpinnerLoadingComponent,
    TableComponent,
    MatCheckboxModule,
    MatMenuModule,
    ButtonComponent,
    IconActionComponent,
    CommonModule,
    StickyZoneComponent,
  ],
  templateUrl: './piteras-page.component.html',
  styleUrl: './piteras-page.component.css',
})
export class PiterasPageComponent implements OnInit {
  private readonly destroyRef = inject(DestroyRef);
  private readonly modalService = inject(ModalService);
  private readonly piterasFacade = inject(PiterasFacade);
  private readonly piterasService = inject(PiterasService);
  private readonly pdfPrintService = inject(PdfPrintService);
  private readonly generalService = inject(GeneralService);

  piteras: PiteraModel[] = [];
  filteredPiteras: PiteraModel[] = [];

  isLoading = true;
  isModalVisible = false;
  number = 0;

  item: PiteraModel | null = null;
  currentModalAction: TypeActionModal = TypeActionModal.Create;
  searchForm!: FormGroup;
  typeSection = TypeList.Piteras;
  typeModal = TypeList.Piteras;
  columnVisibility: Record<string, boolean> = {};
  displayedColumns: string[] = [];

  headerListPiteras: ColumnModel[] = [
    { title: 'Portada', key: 'img', sortable: false },
    { title: 'Título', key: 'title', sortable: true },
    { title: 'Año', key: 'year', sortable: true, width: ColumnWidth.XS },
    { title: 'Temática', key: 'theme', sortable: true },
    { title: 'Url', key: 'url', sortable: true },
  ];

  ngOnInit(): void {
    // Ocultar 'date_payment' y 'date_accounting' al cargar la página
    this.columnVisibility = this.generalService.setColumnVisibility(
      this.headerListPiteras,
      [''] // Coloca las columnas que deseas ocultar aquí
    );

    // Actualiza las columnas visibles según el estado de visibilidad
    this.displayedColumns = this.generalService.updateDisplayedColumns(
      this.headerListPiteras,
      this.columnVisibility
    );
    this.modalService.modalVisibility$
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        tap((isVisible) => {
          this.isModalVisible = isVisible;
        })
      )
      .subscribe();

    this.loadAllPiteras();
  }

  loadAllPiteras(): void {
    this.piterasFacade.loadAllPiteras();
    this.piterasFacade.filteredPiteras$
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        tap((piteras) => {
          this.updatePiteraState(piteras);
        })
      )
      .subscribe();
  }

  applyFilterWord(keyword: string): void {
    this.piterasFacade.applyFilterWord(keyword);
  }

  addNewPiteraModal(): void {
    this.openModal(this.typeModal, TypeActionModal.Create, null);
  }

  onOpenModal(event: {
    typeModal: TypeList;
    action: TypeActionModal;
    item?: PiteraModel;
  }): void {
    this.openModal(event.typeModal, event.action, event.item ?? null);
  }

  openModal(
    typeModal: TypeList,
    action: TypeActionModal,
    pitera: PiteraModel | null
  ): void {
    this.currentModalAction = action;
    this.item = pitera;
    this.typeModal = typeModal;
    this.modalService.openModal();
  }

  onCloseModal(): void {
    this.modalService.closeModal();
  }

  confirmDeletePitera(pitera: PiteraModel | null): void {
    if (!pitera) return;
    this.piterasFacade.deletePitera(pitera.id);
    this.onCloseModal();
  }

  sendFormPitera(event: { itemId: number; formData: FormData }): void {
    const save$ = event.itemId
      ? this.piterasFacade.editPitera(event.itemId, event.formData)
      : this.piterasFacade.addPitera(event.formData);

    save$
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        tap(() => this.onCloseModal())
      )
      .subscribe();
  }

  private updatePiteraState(piteras: PiteraModel[] | null): void {
    if (!piteras) return;

    this.piteras = this.piterasService.sortPiterasByYear(piteras);
    this.filteredPiteras = [...this.piteras];
    this.number = this.piterasService.countPiteras(piteras);
    this.isLoading = false;
  }
  printTableAsPdf(): void {
    this.pdfPrintService.printTableAsPdf('table-to-print', 'piteras.pdf');
  }
  getVisibleColumns() {
    return this.headerListPiteras.filter(
      (col) => this.columnVisibility[col.key]
    );
  }
  // Método para actualizar las columnas visibles cuando se hace toggle
  toggleColumn(key: string): void {
    // Cambia la visibilidad de la columna en columnVisibility
    this.columnVisibility[key] = !this.columnVisibility[key];
    // Actualiza las columnas visibles en la tabla después de cambiar el estado
    this.displayedColumns = this.generalService.updateDisplayedColumns(
      this.headerListPiteras,
      this.columnVisibility
    );
  }

  private updateDisplayedColumns(): void {
    const base = ['number']; // si usas un número de fila
    const dynamic = this.headerListPiteras
      .filter((col) => this.columnVisibility[col.key])
      .map((col) => col.key);
    this.displayedColumns = [...base, ...dynamic, 'actions'];
  }
}
