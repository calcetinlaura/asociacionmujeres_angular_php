import { CommonModule } from '@angular/common';
import { Component, EventEmitter, inject, Input, Output } from '@angular/core';
import {
  FormArray,
  FormControl,
  FormGroup,
  ReactiveFormsModule,
  Validators,
} from '@angular/forms';
import { MatCardModule } from '@angular/material/card';
import { EditorModule } from '@tinymce/tinymce-angular';
import { filter, tap } from 'rxjs';
import { PlacesFacade } from 'src/app/application/places.facade';
import {
  ManagementFilterPlaces,
  PlaceModel,
  TypeFilterPlaces,
} from 'src/app/core/interfaces/place.interface';
import { TypeList } from 'src/app/core/models/general.model';
import { ImageControlComponent } from 'src/app/modules/dashboard/components/image-control/image-control.component';
import { GeneralService } from 'src/app/shared/services/generalService.service';
import { AddButtonComponent } from '../../../../../../shared/components/buttons/button-add/button-add.component';

@Component({
  selector: 'app-form-place',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    EditorModule,
    MatCardModule,
    ImageControlComponent,
    AddButtonComponent,
  ],
  templateUrl: './form-place.component.html',
  styleUrls: ['../../../../components/form/form.component.css'],
})
export class FormPlaceComponent {
  private placesFacade = inject(PlacesFacade);
  private generalService = inject(GeneralService);

  @Input() itemId!: number;
  @Output() sendFormPlace = new EventEmitter<{
    itemId: number;
    newPlaceData: FormData;
  }>();

  selectedImageFile: File | null = null;
  imageSrc: string = '';
  errorSession: boolean = false;
  submitted: boolean = false;
  titleForm: string = 'Registrar espacio';
  buttonAction: string = 'Guardar';
  managementPlaces = ManagementFilterPlaces;
  typePlaces = TypeFilterPlaces;
  typeList = TypeList.Places;

  // Definir formulario
  formPlace = new FormGroup({
    name: new FormControl('', [Validators.required]),
    province: new FormControl('', [Validators.required]),
    town: new FormControl('', [Validators.required]),
    address: new FormControl(''),
    post_code: new FormControl(''),
    lat: new FormControl(0),
    lon: new FormControl(0),
    description: new FormControl('', [Validators.maxLength(2000)]),
    img: new FormControl(''),
    observations: new FormControl('', [Validators.maxLength(2000)]),
    management: new FormControl(''),
    hasSubspaces: new FormControl(false),
    subspaces: new FormArray([]),
    type: new FormControl(''),
    capacity: new FormControl(0),
  });

  ngOnInit(): void {
    if (this.itemId) {
      this.placesFacade.loadPlaceById(this.itemId);
      this.placesFacade.selectedPlace$
        .pipe(
          filter((place: PlaceModel | null) => place !== null),
          tap((place: PlaceModel | null) => {
            if (place) {
              // Cargar los valores del formulario
              this.formPlace.patchValue({
                name: place.name || '',
                province: place.province || '',
                town: place.town || '',
                address: place.address || '',
                post_code: place.post_code || '',
                lat: place.lat || 0,
                lon: place.lon || 0,
                capacity: place.capacity || 0,
                description: place.description || '',
                observations: place.observations || '',
                management: place.management || '',
                type: place.type || '',
                img: place.img || '',
              });

              // Manejo de subspaces
              this.setSubspaces(place.subspaces || []);
              this.titleForm = 'Editar espacio';
              this.buttonAction = 'Guardar cambios';

              if (place.img) {
                this.imageSrc = place.img;
                this.selectedImageFile = null;
              }
            }
          })
        )
        .subscribe();
    }
  }
  onHasSubspacesChange(event: Event): void {
    const inputElement = event.target as HTMLInputElement;
    const isChecked = inputElement.checked;

    if (isChecked && this.subspaces.length === 0) {
      this.addSubspace();
      this.formPlace.patchValue({
        type: '',
        capacity: 0,
      });
      // 🔹 Agrega una sala automáticamente si no hay ninguna
    } else if (!isChecked) {
      this.subspaces.clear(); // 🔹 Si el usuario desmarca, elimina todas las salas
    }
  }

  setSubspaces(subspaces: any): void {
    if (!subspaces || (Array.isArray(subspaces) && subspaces.length === 0)) {
      this.subspaces.clear(); // ✅ Si no hay subespacios, vaciamos el FormArray
      this.formPlace.patchValue({ hasSubspaces: false }); // ❌ Desactivar checkbox
      return;
    }

    // 🔹 Si `subspaces` es un string JSON, conviértelo a un array
    let subspacesArray: any[] = [];
    if (typeof subspaces === 'string') {
      try {
        subspacesArray = JSON.parse(subspaces);
      } catch (error) {
        console.error('Error al parsear subspaces:', error);
        subspacesArray = []; // Evita fallos si el JSON es inválido
      }
    } else if (Array.isArray(subspaces)) {
      subspacesArray = subspaces; // ✅ Si ya es un array, úsalo directamente
    }

    this.subspaces.clear(); // Limpiamos los subespacios actuales

    // 🔹 Ahora, `subspacesArray` es un array seguro y podemos usar `.forEach()`
    subspacesArray.forEach((subspace) => {
      this.addSubspace(subspace);
    });

    // ✅ Marcar el checkbox como `true` si hay subespacios
    this.formPlace.patchValue({ hasSubspaces: true });
  }

  get subspaces(): FormArray {
    return this.formPlace.get('subspaces') as FormArray;
  }

  addSubspace(subspaceData: any = {}): void {
    const newSubspace = new FormGroup({
      name: new FormControl(subspaceData.name || '', Validators.required),
      location: new FormControl(
        subspaceData.location || '',
        Validators.required
      ),
      type: new FormControl(subspaceData.type || '', Validators.required),
      capacity: new FormControl(subspaceData.capacity || null),
    });
    this.subspaces.push(newSubspace);
  }

  removeSubspace(index: number) {
    this.subspaces.removeAt(index);
  }

  async onImageSelected(file: File) {
    const result = await this.generalService.handleFileSelection(file);
    this.selectedImageFile = result.file;
    this.imageSrc = result.imageSrc;
  }

  onSendFormPlace(): void {
    if (this.formPlace.invalid) {
      this.submitted = true;
      console.log('Formulario inválido', this.formPlace.errors);
      return;
    }

    const formData = new FormData();
    const formValue = this.formPlace.value;

    formData.append('name', formValue.name ?? '');
    formData.append('province', formValue.province ?? '');
    formData.append('lat', String(formValue.lat ?? ''));
    formData.append('lon', String(formValue.lon ?? ''));
    formData.append('capacity', String(formValue.capacity ?? ''));
    formData.append('address', formValue.address ?? '');
    formData.append('town', formValue.town ?? '');
    formData.append('post_code', formValue.post_code ?? '');
    formData.append('description', formValue.description ?? '');
    formData.append('observations', formValue.observations ?? '');
    formData.append('management', formValue.management ?? '');
    formData.append('type', formValue.type ?? '');
    formData.append('subspaces', JSON.stringify(formValue.subspaces));

    if (this.selectedImageFile) {
      formData.append('img', this.selectedImageFile);
    } else if (this.imageSrc) {
      formData.append('existingImg', this.imageSrc);
    }

    if (this.itemId) {
      formData.append('_method', 'PATCH');
      formData.append('id', this.itemId.toString());
    }

    this.sendFormPlace.emit({
      itemId: this.itemId,
      newPlaceData: formData,
    });
  }
}
