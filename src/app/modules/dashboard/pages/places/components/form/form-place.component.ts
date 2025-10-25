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
import { QuillModule } from 'ngx-quill';
import { filter, tap } from 'rxjs';
import { PlacesFacade } from 'src/app/application/places.facade';
import {
  ManagementFilterPlaces,
  PlaceModel,
  TypeFilterPlaces,
} from 'src/app/core/interfaces/place.interface';
import { TypeList } from 'src/app/core/models/general.model';
import { ButtonIconComponent } from 'src/app/shared/components/buttons/button-icon/button-icon.component';
import { ButtonSelectComponent } from 'src/app/shared/components/buttons/button-select/button-select.component';
import { SpinnerLoadingComponent } from 'src/app/shared/components/spinner-loading/spinner-loading.component';
import { ScrollToFirstErrorDirective } from 'src/app/shared/directives/scroll-to-first-error.directive';
import { GeneralService } from 'src/app/shared/services/generalService.service';

@Component({
  selector: 'app-form-place',
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatCardModule,
    ButtonIconComponent,
    QuillModule,
    SpinnerLoadingComponent,
    ButtonSelectComponent,
    ScrollToFirstErrorDirective,
  ],
  templateUrl: './form-place.component.html',
  styleUrls: ['./../../../../../../shared/components/form/form.component.css'],
})
export class FormPlaceComponent {
  private placesFacade = inject(PlacesFacade);
  private generalService = inject(GeneralService);

  @Input() itemId!: number;
  @Output() submitForm = new EventEmitter<{
    itemId: number;
    formData: FormData;
  }>();

  selectedImageFile: File | null = null;
  imageSrc: string = '';
  submitted: boolean = false;
  titleForm: string = 'Registrar espacio';
  buttonAction: string = 'Guardar';
  managementPlaces = ManagementFilterPlaces;
  typePlaces = TypeFilterPlaces;
  typeList = TypeList.Places;
  placeTypeManagement: 'PUBLIC' | 'PRIVATE' | '' = '';
  placeTypeRoom: 'SINGLE' | 'MULTIPLE' | '' = '';
  placeTypeUbication: 'ABROAD' | 'INSIDE' | '' = '';
  formPlace = new FormGroup({
    name: new FormControl('', [Validators.required]),
    province: new FormControl('', [Validators.required]),
    town: new FormControl('', [Validators.required]),
    address: new FormControl(''),
    post_code: new FormControl('', [
      Validators.pattern(/^(?:0[1-9]|[1-4][0-9]|5[0-2])[0-9]{3}$/),
    ]),
    lat: new FormControl(0),
    lon: new FormControl(0),
    description: new FormControl('', [Validators.maxLength(500)]),
    img: new FormControl(''),
    observations: new FormControl('', [Validators.maxLength(300)]),
    management: new FormControl(''),
    salas: new FormArray([]),
    type_room: new FormControl(''),
    type_ubication: new FormControl(''),
    capacity: new FormControl(0),
  });

  provincias: {
    label: string;
    code: string;
    towns: { label: string; code: string }[];
  }[] = [];

  municipios: { label: string; code: string }[] = [];
  isLoading = true;
  quillModules = {
    toolbar: [
      [{ header: [1, 2, false] }],
      ['bold', 'italic', 'underline'],
      ['image', 'code-block'],
      [{ color: [] }, { background: [] }],
      [{ list: 'ordered' }, { list: 'bullet' }],
      [{ align: [] }],
      ['link', 'clean'],
      [{ indent: '-1' }, { indent: '+1' }],
    ],
  };
  ngOnInit(): void {
    this.isLoading = true;
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
              img: place.img || '',
            });
            switch (place.management as 'PUBLIC' | 'PRIVATE' | '') {
              case 'PUBLIC':
                this.setPlaceTypeManagement('PUBLIC');
                break;

              case 'PRIVATE':
                this.setPlaceTypeManagement('PRIVATE');
                break;

              default:
                // Cubre null, undefined o cualquier valor inesperado
                this.setPlaceTypeManagement('');
                break;
            }
            switch (place.type_room as 'SINGLE' | 'MULTIPLE' | '') {
              case 'SINGLE':
                this.setPlaceTypeRoom('SINGLE');
                break;

              case 'MULTIPLE':
                this.setPlaceTypeRoom('MULTIPLE');
                break;

              default:
                // Cubre null, undefined o cualquier valor inesperado
                this.setPlaceTypeRoom('');
                break;
            }
            this.setSalas(place.salas || []);
            this.titleForm = 'Editar espacio';
            this.buttonAction = 'Guardar cambios';

            if (place.img) {
              this.imageSrc = place.img;
              this.selectedImageFile = null;
            }
            this.isLoading = false;
          })
        )
        .subscribe();
    } else {
      this.isLoading = false;
    }
  }

  onProvinceChange(): void {
    const selectedProvince = this.formPlace.value.province;
    const province = this.provincias.find((p) => p.label === selectedProvince);
    this.municipios = province?.towns ?? [];
    this.formPlace.patchValue({ town: '' });
  }

  setSalas(salas: any): void {
    this.salas.clear();

    if (!salas || !Array.isArray(salas) || salas.length === 0) {
      return;
    }

    salas.forEach((sala) => this.addSala(sala));
    // this.formPlace.patchValue({ type_room: 'MULTIPLE' });
  }

  get salas(): FormArray {
    return this.formPlace.get('salas') as FormArray;
  }

  addSala(salaData: any = {}): void {
    const newSala = new FormGroup({
      id: new FormControl(salaData.id ?? null),
      name: new FormControl(salaData.name || '', Validators.required),
      room_location: new FormControl(salaData.room_location || ''),
      type_ubication: new FormControl(
        salaData.type_ubication || '',
        Validators.required
      ),
      capacity: new FormControl(salaData.capacity ?? null),
    });

    this.salas.push(newSala);
  }

  removeSala(index: number): void {
    this.salas.removeAt(index);
  }

  setPlaceTypeManagement(type: 'PUBLIC' | 'PRIVATE' | ''): void {
    this.placeTypeManagement = type;
    this.formPlace.patchValue({ management: type });
  }

  get isPlaceTypeManagemenSelected(): boolean {
    return (
      this.placeTypeManagement === 'PUBLIC' ||
      this.placeTypeManagement === 'PRIVATE'
    );
  }
  setPlaceTypeRoom(type: 'SINGLE' | 'MULTIPLE' | ''): void {
    this.placeTypeRoom = type;
    this.formPlace.patchValue({ type_room: type });
    if (type === 'MULTIPLE') {
      this.addSala();
    }
  }

  get isPlaceTypeRoomSelected(): boolean {
    return this.placeTypeRoom === 'SINGLE' || this.placeTypeRoom === 'MULTIPLE';
  }
  async onImageSelected(file: File) {
    const result = await this.generalService.handleFileSelection(file);
    this.selectedImageFile = result.file;
    this.imageSrc = result.imageSrc;
  }

  onSendFormPlace(): void {
    if (this.formPlace.invalid) {
      this.submitted = true;
      this.formPlace.markAllAsTouched();

      // 🔎 Log legible de qué controles fallan (incluye FormArray 'salas')
      console.warn('FORM STATUS:', this.formPlace.status);
      console.warn(
        'INVALID TREE:',
        this.collectInvalidControls(this.formPlace)
      );
      return;
    }

    const formValue = this.formPlace.value;
    if (formValue.description) {
      formValue.description = formValue.description.replace(/&nbsp;/g, ' ');
    }
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
    formData.append('type_room', formValue.type_room ?? '');
    formData.append('type_ubication', formValue.type_ubication ?? '');

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

    this.submitForm.emit({
      itemId: this.itemId,
      formData: formData,
    });
  }

  private collectInvalidControls(
    group: FormGroup | FormArray,
    path: string[] = []
  ): any {
    const result: any = {};
    const controls =
      group instanceof FormGroup
        ? group.controls
        : (group as FormArray).controls;

    Object.entries(controls).forEach(([key, ctrl], idx) => {
      const seg = group instanceof FormArray ? `[${idx}]` : key;
      const newPath = [...path, seg];

      if (ctrl instanceof FormGroup || ctrl instanceof FormArray) {
        const child = this.collectInvalidControls(ctrl, newPath);
        if (Object.keys(child).length) result[newPath.join('.')] = child;
      } else {
        if (ctrl.invalid) {
          result[newPath.join('.')] = ctrl.errors;
        }
      }
    });

    return result;
  }
  observationsLen(): number {
    return (this.formPlace.get('observations')?.value || '').length;
  }
  descriptionLen(): number {
    return (this.formPlace.get('description')?.value || '').length;
  }
}
