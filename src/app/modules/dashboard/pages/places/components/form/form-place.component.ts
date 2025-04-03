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
import { AddButtonComponent } from 'src/app/shared/components/buttons/button-add/button-add.component';
import townsData from 'data/towns.json';
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
    hassalas: new FormControl(false),
    salas: new FormArray([]),
    type: new FormControl(''),
    capacity: new FormControl(0),
  });
  provincias: {
    label: string;
    code: string;
    towns: { label: string; code: string }[];
  }[] = [];
  municipios: { label: string; code: string }[] = [];

  ngOnInit(): void {
    this.provincias = townsData
      .flatMap((region) => region.provinces)
      .sort((a, b) => a.label.localeCompare(b.label));
    if (this.itemId) {
      this.placesFacade.loadPlaceById(this.itemId);
      this.placesFacade.selectedPlace$
        .pipe(
          filter((place: PlaceModel | null) => place !== null),
          tap((place: PlaceModel | null) => {
            if (place) {
              // 🔹 Primero actualizamos los municipios basándonos en la provincia recibida
              const province = this.provincias.find(
                (p) => p.label === place.province
              );
              this.municipios = province?.towns ?? [];
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

              // Manejo de salas
              this.setsalas(place.salas || []);
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
  onProvinceChange(): void {
    const selectedProvince = this.formPlace.value.province;
    const province = this.provincias.find((p) => p.label === selectedProvince);
    this.municipios = province?.towns ?? [];
    this.formPlace.patchValue({ town: '' }); // limpia el municipio
  }

  onHassalasChange(event: Event): void {
    const inputElement = event.target as HTMLInputElement;
    const isChecked = inputElement.checked;

    if (isChecked && this.salas.length === 0) {
      this.addsala();
      this.formPlace.patchValue({
        type: '',
        capacity: 0,
      });
      // 🔹 Agrega una sala automáticamente si no hay ninguna
    } else if (!isChecked) {
      this.salas.clear(); // 🔹 Si el usuario desmarca, elimina todas las salas
    }
  }

  setsalas(salas: any): void {
    if (!salas || (Array.isArray(salas) && salas.length === 0)) {
      this.salas.clear(); // ✅ Si no hay subespacios, vaciamos el FormArray
      this.formPlace.patchValue({ hassalas: false }); // ❌ Desactivar checkbox
      return;
    }

    // 🔹 Si `salas` es un string JSON, conviértelo a un array
    let salasArray: any[] = [];
    if (typeof salas === 'string') {
      try {
        salasArray = JSON.parse(salas);
      } catch (error) {
        console.error('Error al parsear salas:', error);
        salasArray = []; // Evita fallos si el JSON es inválido
      }
    } else if (Array.isArray(salas)) {
      salasArray = salas; // ✅ Si ya es un array, úsalo directamente
    }

    this.salas.clear(); // Limpiamos los subespacios actuales

    // 🔹 Ahora, `salasArray` es un array seguro y podemos usar `.forEach()`
    salasArray.forEach((sala) => {
      this.addsala(sala);
    });

    // ✅ Marcar el checkbox como `true` si hay subespacios
    this.formPlace.patchValue({ hassalas: true });
  }

  get salas(): FormArray {
    return this.formPlace.get('salas') as FormArray;
  }

  addsala(salaData: any = {}): void {
    const newsala = new FormGroup({
      name: new FormControl(salaData.name || '', Validators.required),
      location: new FormControl(salaData.location || '', Validators.required),
      type: new FormControl(salaData.type || '', Validators.required),
      capacity: new FormControl(salaData.capacity || null),
    });
    this.salas.push(newsala);
  }

  removesala(index: number) {
    this.salas.removeAt(index);
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
    formData.append('salas', JSON.stringify(formValue.salas));

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
