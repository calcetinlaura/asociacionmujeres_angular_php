import { CommonModule } from '@angular/common';
import {
  Component,
  DestroyRef,
  ElementRef,
  inject,
  OnInit,
  ViewChild,
} from '@angular/core';
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
import { IconActionComponent } from 'src/app/shared/components/buttons/icon-action/icon-action.component';
import { InputSearchComponent } from 'src/app/shared/components/inputs/input-search/input-search.component';
import { ModalComponent } from 'src/app/shared/components/modal/modal.component';
import { ModalService } from 'src/app/shared/components/modal/services/modal.service';
import { SpinnerLoadingComponent } from 'src/app/shared/components/spinner-loading/spinner-loading.component';
import { GeneralService } from 'src/app/shared/services/generalService.service';
import { PdfPrintService } from 'src/app/shared/services/PdfPrintService.service';
import { StickyZoneComponent } from '../../components/sticky-zone/sticky-zone.component';
import { ColumnMenuComponent } from '../../components/table/column-menu.component';

@Component({
  selector: 'app-piteras-page',
  standalone: true,
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
    IconActionComponent,
    CommonModule,
    StickyZoneComponent,
    ColumnMenuComponent,
  ],
  templateUrl: './piteras-page.component.html',
})
export class PiterasPageComponent implements OnInit {
  private readonly destroyRef = inject(DestroyRef);
  private readonly modalService = inject(ModalService);
  readonly piterasFacade = inject(PiterasFacade);
  private readonly piterasService = inject(PiterasService);
  private readonly generalService = inject(GeneralService);
  private readonly pdfPrintService = inject(PdfPrintService);

  columnVisibility: Record<string, boolean> = {};
  displayedColumns: string[] = [];
  headerListPiteras: ColumnModel[] = [
    {
      title: 'Nº',
      key: 'publication_number',
      sortable: true,
      width: ColumnWidth.XS,
      textAlign: 'center',
    },
    { title: 'Portada', key: 'img', sortable: false },
    { title: 'Título', key: 'title', sortable: true },

    {
      title: 'Año',
      key: 'year',
      sortable: true,
      width: ColumnWidth.XS,
      textAlign: 'center',
      backColor: true,
    },
    { title: 'Temática', key: 'theme', sortable: true, textAlign: 'center' },
    {
      title: 'Nº págines',
      key: 'pages',
      sortable: true,
      width: ColumnWidth.XS,
      textAlign: 'center',
    },
    { title: 'Url', key: 'url', sortable: true, textAlign: 'center' },
  ];

  piteras: PiteraModel[] = [];
  filteredPiteras: PiteraModel[] = [];

  isModalVisible = false;
  number = 0;

  item: PiteraModel | null = null;
  currentModalAction: TypeActionModal = TypeActionModal.Create;
  searchForm!: FormGroup;

  typeModal = TypeList.Piteras;
  typeSection = TypeList.Piteras;

  @ViewChild('printArea', { static: false })
  printArea!: ElementRef<HTMLElement>;

  ngOnInit(): void {
    // Columnas visibles iniciales
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
    this.piterasFacade.clearSelectedPitera();
    this.modalService.openModal();
  }

  onCloseModal(): void {
    this.modalService.closeModal();
  }

  onDelete({ type, id }: { type: TypeList; id: number }) {
    const actions: Partial<Record<TypeList, (id: number) => void>> = {
      [TypeList.Piteras]: (x) => this.piterasFacade.deletePitera(x),
    };
    actions[type]?.(id);
  }

  sendFormPitera(event: { itemId: number; formData: FormData }): void {
    const save$ = event.itemId
      ? this.piterasFacade.editPitera(event.formData)
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
  }

  async printTableAsPdf(): Promise<void> {
    if (!this.printArea) return;

    await this.pdfPrintService.printElementAsPdf(this.printArea, {
      filename: 'piteras.pdf',
      preset: 'compact', // 'compact' reduce paddings en celdas
      orientation: 'portrait', // o 'landscape' si la tabla es muy ancha
      format: 'a4',
      margins: [5, 5, 5, 5], // mm
    });
  }

  getVisibleColumns() {
    return this.headerListPiteras.filter(
      (col) => this.columnVisibility[col.key]
    );
  }
  // Método para actualizar las columnas visibles cuando se hace toggle
  toggleColumn(key: string): void {
    this.columnVisibility[key] = !this.columnVisibility[key];
    this.displayedColumns = this.generalService.updateDisplayedColumns(
      this.headerListPiteras,
      this.columnVisibility
    );
  }
}
