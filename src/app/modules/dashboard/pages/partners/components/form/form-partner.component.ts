import { CommonModule } from '@angular/common';
import {
  Component,
  DestroyRef,
  EventEmitter,
  inject,
  Input,
  Output,
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
import { MatCheckboxModule } from '@angular/material/checkbox';
import townsData from 'data/towns.json';
import { filter, tap } from 'rxjs';
import { PartnersFacade } from 'src/app/application/partners.facade';
import { PartnerModel } from 'src/app/core/interfaces/partner.interface';
import { TypeList } from 'src/app/core/models/general.model';
import { ImageControlComponent } from 'src/app/modules/dashboard/components/image-control/image-control.component';
import { GeneralService } from 'src/app/shared/services/generalService.service';
@Component({
  selector: 'app-form-partner',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatCheckboxModule,
    MatCardModule,
    ImageControlComponent,
  ],
  templateUrl: './form-partner.component.html',
  styleUrls: ['../../../../components/form/form.component.css'],
})
export class FormPartnerComponent {
  private partnersFacade = inject(PartnersFacade);
  private destroyRef = inject(DestroyRef);
  private generalService = inject(GeneralService);

  @Input() itemId!: number;
  @Output() sendFormPartner = new EventEmitter<{
    itemId: number;
    formData: FormData;
  }>();
  selectedImageFile: File | null = null;
  partnerData: PartnerModel | null = null;
  imageSrc: string = '';
  errorSession: boolean = false;
  submitted: boolean = false;
  titleForm: string = 'Registrar socia';
  buttonAction: string = 'Guardar';
  years: number[] = [];
  typeList = TypeList.Partners;

  formPartner = new FormGroup({
    name: new FormControl('', [Validators.required]),
    surname: new FormControl(''),
    birthday: new FormControl<string | null>(null),
    province: new FormControl(''),
    town: new FormControl(''),
    post_code: new FormControl(''),
    address: new FormControl(''),
    phone: new FormControl(''),
    email: new FormControl(''),
    cuotas: new FormArray([]), // FormArray para checkboxes dinámicos
    img: new FormControl(''),
    observations: new FormControl(''),
    death: new FormControl(false),
    unsubscribe: new FormControl(false),
  });
  provincias: {
    label: string;
    code: string;
    towns: { label: string; code: string }[];
  }[] = [];
  municipios: { label: string; code: string }[] = [];
  currentYear = this.generalService.currentYear;

  ngOnInit(): void {
    this.years = this.generalService.loadYears(this.currentYear, 1995);

    this.provincias = townsData
      .flatMap((region) => region.provinces)
      .sort((a, b) => a.label.localeCompare(b.label));

    // Inicializa los checkboxes como vacíos al principio
    this.initializeCuotasControls();

    if (this.itemId) {
      this.partnersFacade.loadPartnerById(this.itemId);
      this.partnersFacade.selectedPartner$
        .pipe(
          takeUntilDestroyed(this.destroyRef),
          filter((partner: PartnerModel | null) => partner !== null),
          tap((partner: PartnerModel | null) => {
            if (partner) {
              // 🔹 Primero actualizamos los municipios basándonos en la provincia recibida
              const province = this.provincias.find(
                (p) => p.label === partner.province
              );
              this.municipios = province?.towns ?? [];
              this.partnerData = partner;
              this.formPartner.patchValue({
                name: partner.name,
                surname: partner.surname,
                birthday: partner.birthday
                  ? partner.birthday.toString().slice(0, 10)
                  : '',
                province: partner.province || '',
                town: partner.town || '',
                post_code: partner.post_code || '',
                address: partner.address || '',
                phone: partner.phone || '',
                email: partner.email || '',

                observations: partner.observations || '',
                img: partner.img || '',
                death: partner.death || false,
                unsubscribe: partner.unsubscribe || false,
              });

              this.titleForm = 'Editar Socia';
              this.buttonAction = 'Guardar cambios';

              if (partner.img) {
                this.imageSrc = partner.img;
                this.selectedImageFile = null;
              }
              // Marcar cuotas si existen en la base de datos
              this.setCuotasForm(partner.cuotas || []);
            }
          })
        )
        .subscribe();
    }
  }

  onProvinceChange(): void {
    const selectedProvince = this.formPartner.value.province;
    const province = this.provincias.find((p) => p.label === selectedProvince);
    this.municipios = province?.towns ?? [];
    this.formPartner.patchValue({ town: '' }); // limpia el municipio
  }
  async onImageSelected(file: File) {
    const result = await this.generalService.handleFileSelection(file);
    this.selectedImageFile = result.file;
    this.imageSrc = result.imageSrc;
  }
  /**
   * Inicializa el FormArray `cuotas` con checkboxes vacíos.
   * Si es una edición, se marcarán automáticamente en `setCuotasForm()`.
   */
  initializeCuotasControls(): void {
    const cuotasFormArray = this.formPartner.get('cuotas') as FormArray;
    cuotasFormArray.clear(); // 🔹 LIMPIA EL FORM ARRAY antes de añadir nuevos controles

    this.years.forEach(() => {
      cuotasFormArray.push(new FormControl(false)); // Inicia vacío
    });
  }

  /**
   * Devuelve el control específico de cuota por índice
   */
  getCuotaControl(index: number): FormControl {
    return (this.formPartner.get('cuotas') as FormArray).at(
      index
    ) as FormControl;
  }

  /**
   * Establece las cuotas marcadas cuando se edita un socio
   */
  setCuotasForm(cuotas: number[]): void {
    const cuotasFormArray = this.formPartner.get('cuotas') as FormArray;

    // 🔹 Primero, reiniciar todas las cuotas a "false"
    cuotasFormArray.controls.forEach((control) => control.setValue(false));

    // 🔹 Marcar las cuotas del socio actual
    cuotas.forEach((year) => {
      const index = this.years.indexOf(year);
      if (index !== -1) {
        cuotasFormArray.at(index).setValue(true);
      }
    });
  }

  /**
   * Envía el formulario con los datos del socio.
   */
  onSendFormPartner(): void {
    if (this.formPartner.invalid) {
      this.submitted = true;
      console.log('Formulario inválido', this.formPartner.errors);
      return;
    }

    const selectedCuotas = this.years.filter(
      (_, index) =>
        (this.formPartner.get('cuotas') as FormArray).at(index).value
    );

    const formData = new FormData();
    formData.append('name', this.formPartner.value.name ?? '');
    formData.append('surname', this.formPartner.value.surname ?? '');
    formData.append('birthday', this.formPartner.value.birthday || '');
    formData.append('province', this.formPartner.value.province ?? '');
    formData.append('town', this.formPartner.value.town ?? '');
    formData.append('post_code', this.formPartner.value.post_code ?? '');
    formData.append('address', this.formPartner.value.address ?? '');
    formData.append('phone', this.formPartner.value.phone ?? '');
    formData.append('email', this.formPartner.value.email ?? '');
    formData.append('observations', this.formPartner.value.observations ?? '');
    formData.append('death', String(this.formPartner.value.death ?? false)); // 🔧 Arreglado
    formData.append(
      'unsubscribe',
      String(this.formPartner.value.unsubscribe ?? false)
    );

    // Cuotas: solo las seleccionadas
    formData.append('cuotas', JSON.stringify(selectedCuotas));

    if (this.selectedImageFile) {
      formData.append('img', this.selectedImageFile);
    } else if (this.imageSrc) {
      formData.append('existingImg', this.imageSrc);
    }

    if (this.itemId) {
      formData.append('_method', 'PATCH');
      formData.append('id', this.itemId.toString());
    }

    this.sendFormPartner.emit({
      itemId: this.itemId,
      formData: formData,
    });
  }
}
