import { Component, DestroyRef, inject, OnInit } from '@angular/core';
import { DashboardHeaderComponent } from 'src/app/modules/dashboard/components/dashboard-header/dashboard-header.component';
import { TypeActionModal, TypeList } from 'src/app/core/models/general.model';
import { ColumnModel } from 'src/app/core/interfaces/column.interface';
import { TableComponent } from 'src/app/modules/dashboard/components/table/table.component';
import { ModalComponent } from 'src/app/shared/components/modal/modal.component';
import { CommonModule } from '@angular/common';
import { FormGroup, ReactiveFormsModule } from '@angular/forms';
import { ModalService } from 'src/app/shared/components/modal/services/modal.service';
import { tap } from 'rxjs';
import { AddButtonComponent } from 'src/app/shared/components/buttons/button-add/button-add.component';
import { InputSearchComponent } from 'src/app/shared/components/inputs/input-search/input-search.component';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { SpinnerLoadingComponent } from 'src/app/shared/components/spinner-loading/spinner-loading.component';
import { PlaceModel } from 'src/app/core/interfaces/place.interface';
import { PlacesFacade } from 'src/app/application/places.facade';
import { PlacesService } from 'src/app/core/services/places.services';

@Component({
  selector: 'app-places-page',
  standalone: true,
  imports: [
    CommonModule,
    DashboardHeaderComponent,
    ModalComponent,
    AddButtonComponent,
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
    { title: 'Imagen', key: 'img' },
    { title: 'Nombre', key: 'name' },
    { title: 'Municipio', key: 'town' },
    { title: 'Dirección', key: 'address' },
    { title: 'Salas', key: 'salasCount' },
    { title: 'Latitud', key: 'lat' },
    { title: 'Longitud', key: 'lon' },
    { title: 'Gestión', key: 'management' },
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

  sendFormPlace(event: { itemId: number; newPlaceData: FormData }): void {
    const save$ = event.itemId
      ? this.placesFacade.editPlace(event.itemId, event.newPlaceData)
      : this.placesFacade.addPlace(event.newPlaceData);

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
        salasCount: salasArray.length, // ✅ Ahora cuenta correctamente
      };
    });

    this.filteredPlaces = [...this.places];
    this.number = this.placesService.countPlaces(places);
    this.isLoading = false;
  }
}
