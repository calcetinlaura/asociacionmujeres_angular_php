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

import { PiterasFacade } from 'src/app/application/piteras.facade';
import {
  ColumnModel,
  ColumnWidth,
} from 'src/app/core/interfaces/column.interface';
import { PiteraModel } from 'src/app/core/interfaces/pitera.interface';
import { TypeActionModal, TypeList } from 'src/app/core/models/general.model';
import { PdfPrintService } from 'src/app/core/services/PdfPrintService.service';
import { PiterasService } from 'src/app/core/services/piteras.services';

import { DashboardHeaderComponent } from 'src/app/shared/components/dashboard-header/dashboard-header.component';
import { ModalShellComponent } from 'src/app/shared/components/modal/modal-shell.component';
import { PageToolbarComponent } from 'src/app/shared/components/page-toolbar/page-toolbar.component';
import { SpinnerLoadingComponent } from 'src/app/shared/components/spinner-loading/spinner-loading.component';
import { StickyZoneComponent } from 'src/app/shared/components/sticky-zone/sticky-zone.component';
import { TableComponent } from 'src/app/shared/components/table/table.component';

import { ModalFacade } from 'src/app/application/modal.facade';
import { useColumnVisibility } from 'src/app/shared/hooks/use-column-visibility';
import { useEntityList } from 'src/app/shared/hooks/use-entity-list';

@Component({
  selector: 'app-piteras-page',
  standalone: true,
  imports: [
    // UI
    DashboardHeaderComponent,
    SpinnerLoadingComponent,
    StickyZoneComponent,
    TableComponent,
    ModalShellComponent,
    PageToolbarComponent,
    // Angular
    CommonModule,
    MatMenuModule,
    MatCheckboxModule,
  ],
  templateUrl: './piteras-page.component.html',
})
export class PiterasPageComponent implements OnInit {
  // ──────────────────────────────────────────────────────────────────────────────
  // Inyecciones
  // ──────────────────────────────────────────────────────────────────────────────
  private readonly destroyRef = inject(DestroyRef);
  private readonly modalFacade = inject(ModalFacade);
  private readonly piterasService = inject(PiterasService);
  private readonly pdfPrintService = inject(PdfPrintService);
  readonly piterasFacade = inject(PiterasFacade);

  // ──────────────────────────────────────────────────────────────────────────────
  // Columnas
  // ──────────────────────────────────────────────────────────────────────────────
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
      title: 'Resumen',
      key: 'summary',
      sortable: true,
      booleanIndicator: true,
      width: ColumnWidth.XS,
    },
    {
      title: 'Nº páginas',
      key: 'pages',
      sortable: true,
      width: ColumnWidth.XS,
      textAlign: 'center',
    },
    { title: 'Url', key: 'url', sortable: true, textAlign: 'center' },
  ];

  // Columnas visibles + lista procesada
  readonly col = useColumnVisibility('piteras-table', this.headerListPiteras);
  readonly list = useEntityList<PiteraModel>({
    filtered$: this.piterasFacade.filteredPiteras$.pipe(map((v) => v ?? [])),
    sort: (arr) => this.piterasService.sortPiterasByYear(arr),
    count: (arr) => this.piterasService.countPiteras(arr),
  });

  readonly TypeList = TypeList;
  readonly hasRowsSig = computed(() => this.list.countSig() > 0);

  // ──────────────────────────────────────────────────────────────────────────────
  // Modal (usando ModalFacade)
  // ──────────────────────────────────────────────────────────────────────────────
  readonly modalVisibleSig = this.modalFacade.isVisibleSig;
  readonly currentModalTypeSig = this.modalFacade.typeSig;
  readonly currentModalActionSig = this.modalFacade.actionSig;
  readonly currentItemSig = this.modalFacade.itemSig;

  // Ref impresión
  @ViewChild('printArea', { static: false })
  printArea!: ElementRef<HTMLElement>;

  // ──────────────────────────────────────────────────────────────────────────────
  // Lifecycle
  // ──────────────────────────────────────────────────────────────────────────────
  ngOnInit(): void {
    this.loadAllPiteras();
  }

  // ──────────────────────────────────────────────────────────────────────────────
  // Carga y búsqueda
  // ──────────────────────────────────────────────────────────────────────────────
  loadAllPiteras(): void {
    this.piterasFacade.loadAllPiteras();
  }

  applyFilterWord(keyword: string): void {
    this.piterasFacade.applyFilterWord(keyword);
  }

  // ──────────────────────────────────────────────────────────────────────────────
  // Modal + CRUD
  // ──────────────────────────────────────────────────────────────────────────────
  addNewPiteraModal(): void {
    this.piterasFacade.clearSelectedPitera();
    this.modalFacade.open(TypeList.Piteras, TypeActionModal.Create, null);
  }

  onOpenModal(event: {
    typeModal: TypeList;
    action: TypeActionModal;
    item?: PiteraModel;
  }): void {
    this.modalFacade.open(event.typeModal, event.action, event.item ?? null);
  }

  onCloseModal(): void {
    this.modalFacade.close();
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
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(() => this.modalFacade.close());
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
}
