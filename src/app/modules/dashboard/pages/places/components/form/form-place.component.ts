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

import townsData from 'data/towns.json';
import { filter, tap } from 'rxjs';
import { PlacesFacade } from 'src/app/application/places.facade';
import {
  ManagementFilterPlaces,
  PlaceModel,
  TypeFilterPlaces,
} from 'src/app/core/interfaces/place.interface';
import { TypeList } from 'src/app/core/models/general.model';
import { ImageControlComponent } from 'src/app/modules/dashboard/components/image-control/image-control.component';
import { ButtonIconComponent } from 'src/app/shared/components/buttons/button-icon/button-icon.component';
import { GeneralService } from 'src/app/shared/services/generalService.service';

@Component({
    selector: 'app-form-place',
    imports: [
        CommonModule,
        ReactiveFormsModule,
        MatCardModule,
        ImageControlComponent,
        ButtonIconComponent,
    ],
    templateUrl: './form-place.component.html',
    styleUrls: ['../../../../components/form/form.component.css']
})
export class FormPlaceComponent {
  private placesFacade = inject(PlacesFacade);
  private generalService = inject(GeneralService);

  @Input() itemId!: number;
  @Output() sendFormPlace = new EventEmitter<{
    itemId: number;
    formData: FormData;
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
          filter((place): place is PlaceModel => place !== null),
          tap((place: PlaceModel) => {
            const province = this.provincias.find(
              (p) => p.label === place.province
            );
            this.municipios = province?.towns ?? [];

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

            this.setSalas(place.salas || []);
            this.titleForm = 'Editar espacio';
            this.buttonAction = 'Guardar cambios';

            if (place.img) {
              this.imageSrc = place.img;
              this.selectedImageFile = null;
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
    this.formPlace.patchValue({ town: '' });
  }

  onHassalasChange(event: Event): void {
    const inputElement = event.target as HTMLInputElement;
    const isChecked = inputElement.checked;

    if (isChecked && this.salas.length === 0) {
      this.addSala();
      this.formPlace.patchValue({ type: '', capacity: 0 });
    } else if (!isChecked) {
      this.salas.clear();
    }
  }

  setSalas(salas: any): void {
    this.salas.clear();

    if (!salas || !Array.isArray(salas) || salas.length === 0) {
      this.formPlace.patchValue({ hassalas: false });
      return;
    }

    salas.forEach((sala) => this.addSala(sala));
    this.formPlace.patchValue({ hassalas: true });
  }

  get salas(): FormArray {
    return this.formPlace.get('salas') as FormArray;
  }

  addSala(salaData: any = {}): void {
    const newSala = new FormGroup({
      id: new FormControl(salaData.id ?? null),
      name: new FormControl(salaData.name || '', Validators.required),
      location: new FormControl(salaData.location || ''),
      type: new FormControl(salaData.type || '', Validators.required),
      capacity: new FormControl(salaData.capacity ?? null),
    });

    this.salas.push(newSala);
  }

  removeSala(index: number): void {
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
      console.warn('Formulario inválido:', this.formPlace.errors);
      return;
    }

    const formValue = this.formPlace.value;
    const formData = new FormData();

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

    // Salas: enviamos como JSON
    formData.append('salas', JSON.stringify(formValue.salas || []));

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
      formData: formData,
    });
  }
}
