import { CommonModule } from '@angular/common';
import { Component, DestroyRef, inject, OnInit } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormGroup, ReactiveFormsModule } from '@angular/forms';
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
import { InputSearchComponent } from 'src/app/shared/components/inputs/input-search/input-search.component';
import { ModalComponent } from 'src/app/shared/components/modal/modal.component';
import { ModalService } from 'src/app/shared/components/modal/services/modal.service';
import { SpinnerLoadingComponent } from 'src/app/shared/components/spinner-loading/spinner-loading.component';

@Component({
  selector: 'app-places-page',
  standalone: true,
  imports: [
    CommonModule,
    DashboardHeaderComponent,
    ModalComponent,
    ButtonIconComponent,
    ReactiveFormsModule,
    InputSearchComponent,
    SpinnerLoadingComponent,
    TableComponent,
  ],
  templateUrl: './places-page.component.html',
  styleUrl: './places-page.component.css',
})
export class PlacesPageComponent implements OnInit {
  private readonly placesFacade = inject(PlacesFacade);
  private readonly modalService = inject(ModalService);
  private readonly destroyRef = inject(DestroyRef);
  private readonly placesService = inject(PlacesService);

  places: PlaceModel[] = [];
  filteredPlaces: PlaceModel[] = [];

  isLoading = true;
  isModalVisible = false;
  number = 0;

  item: PlaceModel | null = null;
  currentModalAction: TypeActionModal = TypeActionModal.Create;
  searchForm!: FormGroup;
  typeList = TypeList.Places;

  headerListPlaces: ColumnModel[] = [
    { title: 'Imagen', key: 'img', sortable: false },
    { title: 'Nombre', key: 'name', sortable: true, width: ColumnWidth.FULL },
    {
      title: 'Dirección',
      key: 'town',
      sortable: true,
      width: ColumnWidth.FULL,
      showIndicatorOnEmpty: true,
    },
    {
      title: 'Salas',
      key: 'salas',
      sortable: true,
      width: ColumnWidth.XS,
      showLengthOnly: true,
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
    {
      title: 'Gestión',
      key: 'management',
      sortable: true,
      width: ColumnWidth.SM,
      showIndicatorOnEmpty: true,
    },
  ];

  ngOnInit(): void {
    this.modalService.modalVisibility$
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        tap((isVisible) => {
          this.isModalVisible = isVisible;
        })
      )
      .subscribe();

    this.loadAllPlaces();
  }

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

  addNewPlaceModal(): void {
    this.openModal(TypeActionModal.Create, null);
  }

  onOpenModal(event: { action: TypeActionModal; item?: PlaceModel }): void {
    this.openModal(event.action, event.item ?? null);
  }
  openModal(action: TypeActionModal, place: PlaceModel | null): void {
    this.currentModalAction = action;
    this.item = place;
    this.modalService.openModal();
  }

  onCloseModal(): void {
    this.modalService.closeModal();
  }

  confirmDeletePlace(place: any | null): void {
    if (!place) return;
    this.placesFacade.deletePlace(place.id);
    this.onCloseModal();
  }

  sendFormPlace(event: { itemId: number; formData: FormData }): void {
    const save$ = event.itemId
      ? this.placesFacade.editPlace(event.itemId, event.formData)
      : this.placesFacade.addPlace(event.formData);

    save$
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        tap(() => this.onCloseModal())
      )
      .subscribe();
  }

  private updatePlaceState(places: PlaceModel[] | null): void {
    if (!places) return;

    this.places = places.map((place) => {
      let salasArray = [];

      // 🔹 Verifica si `salas` es un string (probablemente en JSON) y conviértelo a array
      if (typeof place.salas === 'string') {
        try {
          salasArray = JSON.parse(place.salas);
        } catch (error) {
          console.error('Error al parsear salas:', error);
          salasArray = []; // Evita fallos si el JSON es inválido
        }
      } else if (Array.isArray(place.salas)) {
        salasArray = place.salas;
      }

      return {
        ...place,
      };
    });

    this.filteredPlaces = [...this.places];
    this.number = this.placesService.countPlaces(places);
    this.isLoading = false;
  }
}
