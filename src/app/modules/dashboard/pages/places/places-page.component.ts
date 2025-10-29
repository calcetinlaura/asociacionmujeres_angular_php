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
import { map, tap } from 'rxjs';

import { PlacesFacade } from 'src/app/application/places.facade';
import {
  ColumnModel,
  ColumnWidth,
} from 'src/app/core/interfaces/column.interface';
import { PlaceModel } from 'src/app/core/interfaces/place.interface';
import { TypeActionModal, TypeList } from 'src/app/core/models/general.model';
import { PdfPrintService } from 'src/app/core/services/PdfPrintService.service';

import { DashboardHeaderComponent } from 'src/app/shared/components/dashboard-header/dashboard-header.component';
import { ModalShellComponent } from 'src/app/shared/components/modal/modal-shell.component';
import { PageToolbarComponent } from 'src/app/shared/components/page-toolbar/page-toolbar.component';
import { SpinnerLoadingComponent } from 'src/app/shared/components/spinner-loading/spinner-loading.component';
import { StickyZoneComponent } from 'src/app/shared/components/sticky-zone/sticky-zone.component';
import { TableComponent } from 'src/app/shared/components/table/table.component';

import { FiltersFacade } from 'src/app/application/filters.facade';
import { ModalFacade } from 'src/app/application/modal.facade';
import { useColumnVisibility } from 'src/app/shared/hooks/use-column-visibility';
import { useEntityList } from 'src/app/shared/hooks/use-entity-list';
import { count, sortById } from 'src/app/shared/utils/facade.utils';

@Component({
  selector: 'app-places-page',
  standalone: true,
  imports: [
    DashboardHeaderComponent,
    SpinnerLoadingComponent,
    StickyZoneComponent,
    TableComponent,
    ModalShellComponent,
    CommonModule,
    MatMenuModule,
    MatCheckboxModule,
    PageToolbarComponent,
  ],
  templateUrl: './places-page.component.html',
})
export class PlacesPageComponent implements OnInit {
  private readonly destroyRef = inject(DestroyRef);
  private readonly pdfPrintService = inject(PdfPrintService);
  private readonly modalFacade = inject(ModalFacade);
  readonly placesFacade = inject(PlacesFacade);
  readonly filtersFacade = inject(FiltersFacade);

  // ──────────────────────────────────────────────────────────────────────────────
  // Columnas de la tabla
  // ──────────────────────────────────────────────────────────────────────────────
  headerListPlaces: ColumnModel[] = [
    { title: 'Nombre', key: 'name', sortable: true, width: ColumnWidth.FULL },
    {
      title: 'Dirección',
      key: 'town',
      sortable: true,
      width: ColumnWidth.FULL,
      showIndicatorOnEmpty: true,
    },
    {
      title: 'Tipo',
      key: 'type_room',
      sortable: true,
      width: ColumnWidth.SM,
      textAlign: 'center',
      pipe: 'filterTransformCode',
      pipeArg: 'roomPlaces',
    },
    {
      title: 'Salas',
      key: 'salas',
      sortable: true,
      showIndicatorOnEmpty: true,
      showLengthOnly: true,
      width: ColumnWidth.MD,
    },
    {
      title: 'Gestión',
      key: 'management',
      sortable: true,
      width: ColumnWidth.MD,
      showIndicatorOnEmpty: true,
      pipe: 'filterTransformCode',
      pipeArg: 'managementPlaces',
    },
    {
      title: 'Latitud',
      key: 'lat',
      sortable: true,
      booleanIndicator: true,
      width: ColumnWidth.XS,
    },
    {
      title: 'Longitud',
      key: 'lon',
      sortable: true,
      booleanIndicator: true,
      width: ColumnWidth.XS,
    },
  ];

  // ──────────────────────────────────────────────────────────────────────────────
  // Hooks reutilizables
  // ──────────────────────────────────────────────────────────────────────────────
  readonly col = useColumnVisibility('places-table', this.headerListPlaces, [
    'lat',
    'lon',
  ]);

  readonly list = useEntityList<PlaceModel>({
    filtered$: this.placesFacade.filteredPlaces$.pipe(map((v) => v ?? [])),
    map: (arr) =>
      arr.map((place) => {
        if (typeof place.salas === 'string') {
          try {
            const parsed = JSON.parse(place.salas);
            return { ...place, salas: Array.isArray(parsed) ? parsed : [] };
          } catch {
            return { ...place, salas: [] };
          }
        }
        return place;
      }),
    sort: (arr) => sortById(arr),
    count: (arr) => count(arr),
  });

  readonly TypeList = TypeList;
  readonly hasRowsSig = computed(() => this.list.countSig() > 0);

  // ──────────────────────────────────────────────────────────────────────────────
  // Modal (ModalFacade)
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
    this.placesFacade.loadAllPlaces();
  }

  // ──────────────────────────────────────────────────────────────────────────────
  // Filtro / búsqueda
  // ──────────────────────────────────────────────────────────────────────────────
  applyFilterWord(keyword: string): void {
    this.filtersFacade.setSearch(keyword);
    this.placesFacade.applyFilterWord(keyword);
  }

  // ──────────────────────────────────────────────────────────────────────────────
  // Modal CRUD
  // ──────────────────────────────────────────────────────────────────────────────
  addNewPlaceModal(): void {
    this.placesFacade.clearSelectedPlace();
    this.modalFacade.open(TypeList.Places, TypeActionModal.Create, null);
  }

  onOpenModal(event: {
    typeModal: TypeList;
    action: TypeActionModal;
    item?: PlaceModel;
  }): void {
    const { typeModal, action, item } = event;
    this.modalFacade.open(typeModal, action, item ?? null);
  }

  onCloseModal(): void {
    this.modalFacade.close();
  }

  onDelete({ type, id }: { type: TypeList; id: number }): void {
    const actions: Partial<Record<TypeList, (id: number) => void>> = {
      [TypeList.Places]: (x) => this.placesFacade.deletePlace(x),
    };
    actions[type]?.(id);
  }

  sendFormPlace(event: { itemId: number; formData: FormData }): void {
    const save$ = event.itemId
      ? this.placesFacade.editPlace(event.formData)
      : this.placesFacade.addPlace(event.formData);

    save$
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        tap(() => this.modalFacade.close())
      )
      .subscribe();
  }

  // ──────────────────────────────────────────────────────────────────────────────
  // Impresión
  // ──────────────────────────────────────────────────────────────────────────────
  async printTableAsPdf(): Promise<void> {
    if (!this.printArea) return;

    await this.pdfPrintService.printElementAsPdf(this.printArea, {
      filename: 'espacios.pdf',
      preset: 'compact',
      orientation: 'portrait',
      format: 'a4',
      margins: [5, 5, 5, 5],
    });
  }
}
