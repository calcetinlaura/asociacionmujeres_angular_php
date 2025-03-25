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
import { PlacesFacade } from 'src/app/application/places.facade';
import { FormControl, FormGroup, ReactiveFormsModule } from '@angular/forms';
import { ModalService } from 'src/app/shared/components/modal/services/modal.service';
import { tap } from 'rxjs';
import { AddButtonComponent } from 'src/app/shared/components/buttons/button-add/button-add.component';
import { InputSearchComponent } from 'src/app/shared/components/inputs/input-search/input-search.component';
import { PlaceModel } from 'src/app/core/interfaces/place.interface';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { SpinnerLoadingComponent } from '../../../landing/components/spinner-loading/spinner-loading.component';

@Component({
  selector: 'app-places-page',
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
  templateUrl: './places-page.component.html',
  styleUrl: './places-page.component.css',
})
export class PlacesPageComponent implements OnInit {
  private placesFacade = inject(PlacesFacade);
  private modalService = inject(ModalService);
  private destroyRef = inject(DestroyRef);

  typeList = TypeList.Places;
  places: PlaceModel[] = [];
  filteredPlaces: PlaceModel[] = [];
  searchForm!: FormGroup;
  dataLoaded: boolean = false;
  number: number = 0;
  headerListPlaces: ColumnModel[] = [];
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
    this.loadAllPlaces();

    this.modalService.modalVisibility$
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        tap((isVisible) => {
          this.isModalVisible = isVisible;
        })
      )
      .subscribe();

    this.headerListPlaces = [
      { title: 'Imagen', key: 'img' },
      { title: 'Nombre', key: 'name' },
      { title: 'Municipio', key: 'town' },
      { title: 'Dirección', key: 'address' },
      { title: 'Salas', key: 'subspacesCount' }, // 🔹 Mostrar cantidad de subespacios
      { title: 'Latitud', key: 'lat' },
      { title: 'Longitud', key: 'lon' },
      { title: 'Gestión', key: 'management' },
    ];
  }

  loadAllPlaces(): void {
    this.placesFacade.loadAllPlaces();
    this.placesFacade.places$
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        tap((places) => {
          this.updatePlaceState(places);
        })
      )
      .subscribe();
  }

  applyFilter(keyword: string): void {
    this.placesFacade.applyFilter(keyword);
    this.placesFacade.filteredPlaces$
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        tap((places) => {
          this.updatePlaceState(places);
        })
      )
      .subscribe();
  }

  confirmDeletePlace(item: any): void {
    this.placesFacade.deletePlace(item.id);
    this.modalService.closeModal();
  }

  addNewPlaceModal(): void {
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

  sendFormPlace(event: { itemId: number; newPlaceData: FormData }): void {
    if (event.itemId) {
      this.placesFacade
        .editPlace(event.itemId, event.newPlaceData)
        .pipe(
          takeUntilDestroyed(this.destroyRef),
          tap(() => {
            this.onCloseModal();
          })
        )
        .subscribe();
    } else {
      this.placesFacade
        .addPlace(event.newPlaceData)
        .pipe(
          takeUntilDestroyed(this.destroyRef),
          tap(() => {
            this.onCloseModal();
          })
        )
        .subscribe();
    }
  }

  private updatePlaceState(places: PlaceModel[] | null): void {
    if (places === null) {
      return;
    }

    this.places = places.map((place) => {
      let subspacesArray = [];

      // 🔹 Verifica si `subspaces` es un string (probablemente en JSON) y conviértelo a array
      if (typeof place.subspaces === 'string') {
        try {
          subspacesArray = JSON.parse(place.subspaces);
        } catch (error) {
          console.error('Error al parsear subspaces:', error);
          subspacesArray = []; // Evita fallos si el JSON es inválido
        }
      } else if (Array.isArray(place.subspaces)) {
        subspacesArray = place.subspaces;
      }

      return {
        ...place,
        subspacesCount: subspacesArray.length, // ✅ Ahora cuenta correctamente
      };
    });

    this.filteredPlaces = [...this.places];
    this.number = this.places.length;
    this.dataLoaded = true;
  }
}
