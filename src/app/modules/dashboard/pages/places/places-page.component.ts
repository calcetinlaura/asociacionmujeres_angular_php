import { CommonModule } from '@angular/common';
import {
  Component,
  DestroyRef,
  ElementRef,
  OnInit,
  ViewChild,
  inject,
} from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatMenuModule } from '@angular/material/menu';
import { map } from 'rxjs';

import { PlacesFacade } from 'src/app/application/places.facade';
import {
  ColumnModel,
  ColumnWidth,
} from 'src/app/core/interfaces/column.interface';
import { PlaceModel } from 'src/app/core/interfaces/place.interface';
import { TypeActionModal, TypeList } from 'src/app/core/models/general.model';
import { PlacesService } from 'src/app/core/services/places.services';

import { DashboardHeaderComponent } from 'src/app/modules/dashboard/components/dashboard-header/dashboard-header.component';
import { TableComponent } from 'src/app/modules/dashboard/components/table/table.component';
import { ModalShellComponent } from 'src/app/shared/components/modal/modal-shell.component';
import { ModalService } from 'src/app/shared/components/modal/services/modal.service';
import { SpinnerLoadingComponent } from 'src/app/shared/components/spinner-loading/spinner-loading.component';
import { PdfPrintService } from 'src/app/shared/services/PdfPrintService.service';
import { StickyZoneComponent } from '../../components/sticky-zone/sticky-zone.component';

// Hooks comunes
import { useColumnVisibility } from 'src/app/shared/hooks/use-column-visibility';
import { useEntityList } from 'src/app/shared/hooks/use-entity-list';
import { PageToolbarComponent } from '../../components/page-toolbar/page-toolbar.component';

@Component({
  selector: 'app-places-page',
  standalone: true,
  imports: [
    // UI
    DashboardHeaderComponent,
    SpinnerLoadingComponent,
    StickyZoneComponent,
    TableComponent,
    ModalShellComponent,
    // Angular
    CommonModule,
    MatMenuModule,
    MatCheckboxModule,
    PageToolbarComponent,
  ],
  templateUrl: './places-page.component.html',
})
export class PlacesPageComponent implements OnInit {
  // Facade / services
  readonly placesFacade = inject(PlacesFacade);
  private readonly modalService = inject(ModalService);
  private readonly destroyRef = inject(DestroyRef);
  private readonly placesService = inject(PlacesService);
  private readonly pdfPrintService = inject(PdfPrintService);

  // Columnas de la tabla
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

  // ✅ Hook de columnas (persistencia + helpers)
  readonly col = useColumnVisibility('places-table', this.headerListPlaces, [
    'lat',
    'lon',
  ]);

  // ✅ Hook de lista (mapea, ordena y cuenta)
  readonly list = useEntityList<PlaceModel>({
    filtered$: this.placesFacade.filteredPlaces$.pipe(map((v) => v ?? [])),
    // normalizamos `salas` (string JSON → array)
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
    // si no quieres cambiar el orden, identidad
    sort: (arr) => arr,
    count: (arr) => this.placesService.countPlaces(arr),
  });

  // Modal
  readonly modalVisibleSig = toSignal(this.modalService.modalVisibility$, {
    initialValue: false,
  });
  item: PlaceModel | null = null;
  currentModalAction: TypeActionModal = TypeActionModal.Create;
  typeModal = TypeList.Places;
  typeSection = TypeList.Places;

  // Refs
  @ViewChild('printArea', { static: false })
  printArea!: ElementRef<HTMLElement>;

  // ────────────────────────────────────────────────────────────────────────────
  // Lifecycle
  // ────────────────────────────────────────────────────────────────────────────
  ngOnInit(): void {
    this.loadAllPlaces();
  }

  // ────────────────────────────────────────────────────────────────────────────
  // Carga / búsqueda
  // ────────────────────────────────────────────────────────────────────────────
  loadAllPlaces(): void {
    this.placesFacade.loadAllPlaces();
  }

  applyFilterWord(keyword: string): void {
    this.placesFacade.applyFilterWord(keyword);
  }

  // ────────────────────────────────────────────────────────────────────────────
  // Modal
  // ────────────────────────────────────────────────────────────────────────────
  addNewPlaceModal(): void {
    this.openModal(this.typeModal, TypeActionModal.Create, null);
  }

  onOpenModal(event: {
    typeModal: TypeList;
    action: TypeActionModal;
    item?: PlaceModel;
  }): void {
    this.openModal(event.typeModal, event.action, event.item ?? null);
  }

  openModal(
    typeModal: TypeList,
    action: TypeActionModal,
    place: PlaceModel | null
  ): void {
    this.currentModalAction = action;
    this.item = place;
    this.typeModal = typeModal;

    if (typeModal === TypeList.Places && action === TypeActionModal.Create) {
      this.placesFacade.clearSelectedPlace();
    }

    this.modalService.openModal();
  }

  onCloseModal(): void {
    this.modalService.closeModal();
    this.item = null;
  }

  // ────────────────────────────────────────────────────────────────────────────
  // CRUD
  // ────────────────────────────────────────────────────────────────────────────
  onDelete({ type, id }: { type: TypeList; id: number }) {
    const actions: Partial<Record<TypeList, (id: number) => void>> = {
      [TypeList.Places]: (x) => this.placesFacade.deletePlace(x),
    };
    actions[type]?.(id);
  }

  sendFormPlace(event: { itemId: number; formData: FormData }): void {
    const save$ = event.itemId
      ? this.placesFacade.editPlace(event.formData)
      : this.placesFacade.addPlace(event.formData);

    save$.pipe().subscribe(() => this.onCloseModal());
  }

  // ────────────────────────────────────────────────────────────────────────────
  // Impresión
  // ────────────────────────────────────────────────────────────────────────────
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
