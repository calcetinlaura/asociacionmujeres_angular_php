import { CommonModule } from '@angular/common';
import {
  Component,
  DestroyRef,
  ElementRef,
  OnInit,
  Signal,
  ViewChild,
  WritableSignal,
  computed,
  inject,
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
import { SpinnerLoadingComponent } from 'src/app/shared/components/spinner-loading/spinner-loading.component';
import { PdfPrintService } from 'src/app/shared/services/PdfPrintService.service';

import { StickyZoneComponent } from '../../components/sticky-zone/sticky-zone.component';
import { ColumnMenuComponent } from '../../components/table/column-menu.component';

// 🧩 nuevo shell de modales
import { ModalShellComponent } from 'src/app/shared/components/modal/modal-shell.component';
// 🧩 store reutilizable de visibilidad de columnas (signals)
import { ModalService } from 'src/app/shared/components/modal/services/modal.service';
import { ColumnVisibilityStore } from '../../components/table/column-visibility.store';

@Component({
  selector: 'app-piteras-page',
  standalone: true,
  imports: [
    // UI
    DashboardHeaderComponent,
    SpinnerLoadingComponent,
    StickyZoneComponent,
    TableComponent,
    ButtonIconComponent,
    IconActionComponent,
    InputSearchComponent,
    ColumnMenuComponent,
    ModalShellComponent, // ← usamos el shell en lugar de <app-modal>
    // Angular
    CommonModule,
    ReactiveFormsModule,
    MatMenuModule,
    MatCheckboxModule,
  ],
  templateUrl: './piteras-page.component.html',
})
export class PiterasPageComponent implements OnInit {
  // Servicios
  private readonly destroyRef = inject(DestroyRef);
  private readonly modalService = inject(ModalService);
  private readonly piterasService = inject(PiterasService);
  private readonly pdfPrintService = inject(PdfPrintService);
  private readonly colStore = inject(ColumnVisibilityStore);

  // Facade (pública para la plantilla)
  readonly piterasFacade = inject(PiterasFacade);

  // Columnas
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

  // ✅ signals en lugar de estados sueltos
  columnVisSig!: WritableSignal<Record<string, boolean>>;
  displayedColumnsSig!: Signal<string[]>;

  // Datos
  piteras: PiteraModel[] = [];
  filteredPiteras: PiteraModel[] = [];
  number = 0;

  // Modal
  isModalVisible = false;
  item: PiteraModel | null = null;
  currentModalAction: TypeActionModal = TypeActionModal.Create;
  typeModal: TypeList = TypeList.Piteras;
  typeSection: TypeList = TypeList.Piteras;

  // Form
  searchForm!: FormGroup;

  @ViewChild('printArea', { static: false })
  printArea!: ElementRef<HTMLElement>;

  // ──────────────────────────────────────────────────────────────────────────────
  // Lifecycle
  // ──────────────────────────────────────────────────────────────────────────────
  ngOnInit(): void {
    // 1) inicializa visibilidad (clave única por tabla)
    this.columnVisSig = this.colStore.init(
      'piteras-table',
      this.headerListPiteras,
      []
    );
    // 2) columnas mostradas (keys) derivadas
    this.displayedColumnsSig = computed(() =>
      this.colStore.displayedColumns(
        this.headerListPiteras,
        this.columnVisSig()
      )
    );

    // Visibilidad de la modal
    this.modalService.modalVisibility$
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        tap((isVisible) => (this.isModalVisible = isVisible))
      )
      .subscribe();

    // Carga inicial + estado
    this.loadAllPiteras();
  }

  // ──────────────────────────────────────────────────────────────────────────────
  // Carga y filtros
  // ──────────────────────────────────────────────────────────────────────────────
  loadAllPiteras(): void {
    this.piterasFacade.loadAllPiteras();
    this.piterasFacade.filteredPiteras$
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        tap((piteras) => this.updatePiteraState(piteras))
      )
      .subscribe();
  }

  applyFilterWord(keyword: string): void {
    this.piterasFacade.applyFilterWord(keyword);
  }

  // ──────────────────────────────────────────────────────────────────────────────
  // Modal
  // ──────────────────────────────────────────────────────────────────────────────
  addNewPiteraModal(): void {
    this.openModal(TypeList.Piteras, TypeActionModal.Create, null);
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

    // 🔑 sólo limpiar seleccionado en CREATE para no abrir vacío en ver/editar
    if (typeModal === TypeList.Piteras && action === TypeActionModal.Create) {
      this.piterasFacade.clearSelectedPitera();
    }

    this.modalService.openModal();
  }

  onCloseModal(): void {
    this.modalService.closeModal();
    this.item = null;
  }

  // ──────────────────────────────────────────────────────────────────────────────
  // CRUD
  // ──────────────────────────────────────────────────────────────────────────────
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

  // ──────────────────────────────────────────────────────────────────────────────
  // Tabla helpers
  // ──────────────────────────────────────────────────────────────────────────────
  private updatePiteraState(piteras: PiteraModel[] | null): void {
    if (!piteras) return;
    this.piteras = this.piterasService.sortPiterasByYear(piteras);
    this.filteredPiteras = [...this.piteras];
    this.number = this.piterasService.countPiteras(piteras);
  }

  getVisibleColumns() {
    return this.colStore.visibleColumnModels(
      this.headerListPiteras,
      this.columnVisSig()
    );
  }

  toggleColumn(key: string): void {
    this.colStore.toggle('piteras-table', this.columnVisSig, key);
  }

  // ──────────────────────────────────────────────────────────────────────────────
  // Impresión
  // ──────────────────────────────────────────────────────────────────────────────
  async printTableAsPdf(): Promise<void> {
    if (!this.printArea) return;

    await this.pdfPrintService.printElementAsPdf(this.printArea, {
      filename: 'piteras.pdf',
      preset: 'compact',
      orientation: 'portrait',
      format: 'a4',
      margins: [5, 5, 5, 5],
    });
  }

  // Si en tu shell enseñas “volver”, expón esto:
  get canGoBack(): boolean {
    return false; // no hay navegación entre modales aquí
  }
}
