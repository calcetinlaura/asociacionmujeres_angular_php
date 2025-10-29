import { CommonModule } from '@angular/common';
import {
  Component,
  DestroyRef,
  EventEmitter,
  Input,
  OnInit,
  Output,
  inject,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
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
import { GeneralService } from 'src/app/core/services/generalService.service';
import { ButtonIconComponent } from 'src/app/shared/components/buttons/button-icon/button-icon.component';
import { ButtonSelectComponent } from 'src/app/shared/components/buttons/button-select/button-select.component';
import { SpinnerLoadingComponent } from 'src/app/shared/components/spinner-loading/spinner-loading.component';
import { ScrollToFirstErrorDirective } from 'src/app/shared/directives/scroll-to-first-error.directive';

@Component({
  selector: 'app-form-place',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatCardModule,
    ButtonIconComponent,
    ButtonSelectComponent,
    QuillModule,
    SpinnerLoadingComponent,
    ScrollToFirstErrorDirective,
  ],
  templateUrl: './form-place.component.html',
  styleUrls: ['./../../../../../../shared/components/form/form.component.css'],
})
export class FormPlaceComponent implements OnInit {
  readonly placesFacade = inject(PlacesFacade);
  private readonly generalService = inject(GeneralService);
  private readonly destroyRef = inject(DestroyRef);

  @Input() itemId!: number;
  @Input() item: PlaceModel | null = null;
  @Output() submitForm = new EventEmitter<{
    itemId: number;
    formData: FormData;
  }>();

  selectedImageFile: File | null = null;
  imageSrc = '';
  submitted = false;
  titleForm = 'Registrar espacio';
  buttonAction = 'Guardar';
  typeList = TypeList.Places;

  managementPlaces = ManagementFilterPlaces;
  typePlaces = TypeFilterPlaces;

  placeTypeManagement: 'PUBLIC' | 'PRIVATE' | '' = '';
  placeTypeRoom: 'SINGLE' | 'MULTIPLE' | '' = '';

  provincias: {
    label: string;
    code: string;
    towns: { label: string; code: string }[];
  }[] = [];
  municipios: { label: string; code: string }[] = [];

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

  quillModules = this.generalService.defaultQuillModules;

  ngOnInit(): void {
    this.provincias = townsData
      .flatMap((r) => r.provinces)
      .sort((a, b) => a.label.localeCompare(b.label));

    if (this.item) {
      this.patchForm(this.item);
      return;
    }

    if (this.itemId) {
      this.placesFacade.loadPlaceById(this.itemId);
      this.placesFacade.selectedPlace$
        .pipe(
          takeUntilDestroyed(this.destroyRef),
          filter((place): place is PlaceModel => !!place),
          tap((place) => this.patchForm(place))
        )
        .subscribe();
    }
  }

  // 🧩 PATCH
  private patchForm(place: PlaceModel): void {
    const province = this.provincias.find((p) => p.label === place.province);
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
      management: place.management || '',
      type_room: place.type_room || '',
      type_ubication: place.type_ubication || '',
    });

    this.placeTypeManagement = (place.management as 'PUBLIC' | 'PRIVATE') ?? '';
    this.placeTypeRoom = (place.type_room as 'SINGLE' | 'MULTIPLE') ?? '';
    this.setSalas(place.salas || []);

    this.titleForm = 'Editar espacio';
    this.buttonAction = 'Guardar cambios';

    if (place.img) {
      this.imageSrc = place.img;
      this.selectedImageFile = null;
    }
  }

  // 📍 Provincia
  onProvinceChange(): void {
    const selectedProvince = this.formPlace.value.province;
    const province = this.provincias.find((p) => p.label === selectedProvince);
    this.municipios = province?.towns ?? [];
    this.formPlace.patchValue({ town: '' });
  }

  // 🏛️ Management
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

  // 🏠 Tipo sala
  setPlaceTypeRoom(type: 'SINGLE' | 'MULTIPLE' | ''): void {
    this.placeTypeRoom = type;
    this.formPlace.patchValue({ type_room: type });
    if (type === 'MULTIPLE' && this.salas.length === 0) this.addSala();
  }

  get isPlaceTypeRoomSelected(): boolean {
    return this.placeTypeRoom === 'SINGLE' || this.placeTypeRoom === 'MULTIPLE';
  }

  // 🧱 Salas
  get salas(): FormArray {
    return this.formPlace.get('salas') as FormArray;
  }

  setSalas(salas: any[]): void {
    this.salas.clear();
    if (!salas?.length) return;
    salas.forEach((sala) => this.addSala(sala));
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

  // 🖼️ Imagen
  async onImageSelected(file: File) {
    const result = await this.generalService.handleFileSelection(file);
    this.selectedImageFile = result.file;
    this.imageSrc = result.imageSrc;
  }

  // 🚀 Envío
  onSendFormPlace(): void {
    if (this.formPlace.invalid) {
      this.submitted = true;
      this.formPlace.markAllAsTouched();
      return;
    }

    const rawValues = { ...this.formPlace.getRawValue() } as any;

    if (rawValues.description)
      rawValues.description = rawValues.description.replace(/&nbsp;/g, ' ');

    const formData = this.generalService.createFormData(
      {
        ...rawValues,
        salas: JSON.stringify(rawValues.salas || []),
      },
      { img: this.selectedImageFile },
      this.itemId
    );

    if (this.imageSrc && !this.selectedImageFile)
      formData.append('existingImg', this.imageSrc);

    this.submitForm.emit({ itemId: this.itemId, formData });
  }

  // ✏️ Utilidades
  observationsLen(): number {
    return (this.formPlace.get('observations')?.value || '').length;
  }

  descriptionLen(): number {
    return (this.formPlace.get('description')?.value || '').length;
  }
}
