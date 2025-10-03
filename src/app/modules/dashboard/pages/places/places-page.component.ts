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
import { ButtonIconComponent } from 'src/app/shared/components/buttons/button-icon/button-icon.component';
import { IconActionComponent } from 'src/app/shared/components/buttons/icon-action/icon-action.component';
import { InputSearchComponent } from 'src/app/shared/components/inputs/input-search/input-search.component';
import { ModalShellComponent } from 'src/app/shared/components/modal/modal-shell.component';
import { ModalService } from 'src/app/shared/components/modal/services/modal.service';
import { SpinnerLoadingComponent } from 'src/app/shared/components/spinner-loading/spinner-loading.component';
import { PdfPrintService } from 'src/app/shared/services/PdfPrintService.service';
import { StickyZoneComponent } from '../../components/sticky-zone/sticky-zone.component';
import { ColumnMenuComponent } from '../../components/table/column-menu.component';
import { ColumnVisibilityStore } from '../../components/table/column-visibility.store';

@Component({
  selector: 'app-places-page',
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
    ModalShellComponent,
    // Angular
    CommonModule,
    ReactiveFormsModule,
    MatMenuModule,
    MatCheckboxModule,
  ],
  templateUrl: './places-page.component.html',
})
export class PlacesPageComponent implements OnInit {
  readonly placesFacade = inject(PlacesFacade);
  // Services
  private readonly modalService = inject(ModalService);
  private readonly destroyRef = inject(DestroyRef);
  private readonly placesService = inject(PlacesService);
  private readonly pdfPrintService = inject(PdfPrintService);
  private readonly colStore = inject(ColumnVisibilityStore);

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
      width: ColumnWidth.FULL,
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

  // Signals de columnas
  columnVisSig!: WritableSignal<Record<string, boolean>>;
  displayedColumnsSig!: Signal<string[]>;

  // Datos
  places: PlaceModel[] = [];
  filteredPlaces: PlaceModel[] = [];
  number = 0;

  // Modal
  isModalVisible = false;
  item: PlaceModel | null = null;
  currentModalAction: TypeActionModal = TypeActionModal.Create;
  typeModal = TypeList.Places;
  typeSection = TypeList.Places;

  // Form
  searchForm!: FormGroup;

  @ViewChild('printArea', { static: false })
  printArea!: ElementRef<HTMLElement>;

  // ──────────────────────────────────────────────────────────────────────────────
  // Lifecycle
  // ──────────────────────────────────────────────────────────────────────────────
  ngOnInit(): void {
    // 1) Inicializa visibilidad persistente
    this.columnVisSig = this.colStore.init(
      'places-table',
      this.headerListPlaces,
      ['lat', 'lon']
    );
    // 2) Derivada con keys visibles
    this.displayedColumnsSig = computed(() =>
      this.colStore.displayedColumns(this.headerListPlaces, this.columnVisSig())
    );

    // Visibilidad modal
    this.modalService.modalVisibility$
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        tap((v) => (this.isModalVisible = v))
      )
      .subscribe();

    this.loadAllPlaces();
  }

  // ──────────────────────────────────────────────────────────────────────────────
  // Carga / búsqueda
  // ──────────────────────────────────────────────────────────────────────────────
  loadAllPlaces(): void {
    this.placesFacade.loadAllPlaces();

    this.placesFacade.filteredPlaces$
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        tap((places) => this.updatePlaceState(places))
      )
      .subscribe();
  }

  applyFilterWord(keyword: string): void {
    this.placesFacade.applyFilterWord(keyword);
  }

  // ──────────────────────────────────────────────────────────────────────────────
  // Modal
  // ──────────────────────────────────────────────────────────────────────────────
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

    // 🔑 limpiar seleccionado SOLO en Create (evita abrir vacío al ver/editar)
    if (typeModal === TypeList.Places && action === TypeActionModal.Create) {
      this.placesFacade.clearSelectedPlace();
    }

    this.modalService.openModal();
  }

  onCloseModal(): void {
    this.modalService.closeModal();
    this.item = null; // 🔥 evita arrastrar estado al reabrir
  }

  // ──────────────────────────────────────────────────────────────────────────────
  // CRUD
  // ──────────────────────────────────────────────────────────────────────────────
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
  private updatePlaceState(places: PlaceModel[] | null): void {
    if (!places) return;

    this.places = places.map((place) => {
      // Normalizas 'salas' por si viene como string JSON:
      if (typeof place.salas === 'string') {
        try {
          const parsed = JSON.parse(place.salas);
          return { ...place, salas: Array.isArray(parsed) ? parsed : [] };
        } catch {
          return { ...place, salas: [] };
        }
      }
      return place;
    });

    this.filteredPlaces = [...this.places];
    this.number = this.placesService.countPlaces(places);
  }

  getVisibleColumns() {
    return this.colStore.visibleColumnModels(
      this.headerListPlaces,
      this.columnVisSig()
    );
  }

  toggleColumn(key: string): void {
    this.colStore.toggle('places-table', this.columnVisSig, key);
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
