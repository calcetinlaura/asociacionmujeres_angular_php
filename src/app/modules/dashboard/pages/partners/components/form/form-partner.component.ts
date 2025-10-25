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
import {
  CuotaModel,
  PartnerModel,
  PaymentMethod,
} from 'src/app/core/interfaces/partner.interface';
import { TypeList } from 'src/app/core/models/general.model';
import { ImageControlComponent } from 'src/app/shared/components/image-control/image-control.component';
import { SpinnerLoadingComponent } from 'src/app/shared/components/spinner-loading/spinner-loading.component';
import { ScrollToFirstErrorDirective } from 'src/app/shared/directives/scroll-to-first-error.directive';
import { GeneralService } from 'src/app/shared/services/generalService.service';

type CuotaForm = {
  year: FormControl<number>;
  paid: FormControl<boolean>;
  date_payment: FormControl<string | null>;
  method_payment: FormControl<PaymentMethod | null>;
};

type CuotaFormGroup = FormGroup<CuotaForm>;

@Component({
  selector: 'app-form-partner',
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatCheckboxModule,
    MatCardModule,
    ImageControlComponent,
    SpinnerLoadingComponent,
    ScrollToFirstErrorDirective,
  ],
  templateUrl: './form-partner.component.html',
  styleUrls: ['./../../../../../../shared/components/form/form.component.css'],
})
export class FormPartnerComponent {
  private partnersFacade = inject(PartnersFacade);
  private destroyRef = inject(DestroyRef);
  private generalService = inject(GeneralService);

  @Input() itemId!: number;
  @Output() submitForm = new EventEmitter<{
    itemId: number;
    formData: FormData;
  }>();

  selectedImageFile: File | null = null;
  partnerData: PartnerModel | null = null;
  imageSrc: string = '';
  submitted: boolean = false;
  titleForm: string = 'Registrar socia';
  buttonAction: string = 'Guardar';
  years: number[] = [];
  typeList = TypeList.Partners;

  // (opcional) método de pago "por defecto" para facilitar clicks masivos en la UI
  defaultMethodPayment: PaymentMethod | null = null;
  PaymentMethod = {
    CASH: 'cash' as PaymentMethod,
    DOMICILIATION: 'domiciliation' as PaymentMethod,
  };

  // ---------- FACTORÍA DE FORM GROUP PARA CADA AÑO
  private createCuotaGroup = (seed: Partial<CuotaModel>): CuotaFormGroup => {
    const fg = new FormGroup<CuotaForm>({
      year: new FormControl(seed.year ?? new Date().getFullYear(), {
        nonNullable: true,
      }),
      paid: new FormControl(!!seed.paid, { nonNullable: true }),
      date_payment: new FormControl(seed.date_payment ?? null),
      method_payment: new FormControl(seed.method_payment ?? null),
    }); // 👈 sin validators

    // habilitar/deshabilitar campos según 'paid'
    const toggle = (isPaid: boolean) => {
      const dc = fg.get('date_payment') as FormControl<string | null>;
      const mc = fg.get('method_payment') as FormControl<PaymentMethod | null>;
      if (isPaid) {
        dc.enable({ emitEvent: false });
        mc.enable({ emitEvent: false });
      } else {
        // ✅ Si NO quieres borrar lo ya rellenado al desmarcar, no hagas reset:
        // dc.reset(null, { emitEvent: false });
        // mc.reset(null, { emitEvent: false });
        dc.disable({ emitEvent: false });
        mc.disable({ emitEvent: false });
      }
      fg.updateValueAndValidity({ emitEvent: false });
    };

    toggle(fg.get('paid')!.value);
    fg.get('paid')!.valueChanges.subscribe(toggle);

    return fg;
  };

  formPartner = new FormGroup({
    name: new FormControl('', [Validators.required]),
    surname: new FormControl(''),
    birthday: new FormControl<string | null>(null),
    province: new FormControl(''),
    town: new FormControl(''),
    post_code: new FormControl('', [
      Validators.pattern(/^(?:0[1-9]|[1-4][0-9]|5[0-2])[0-9]{3}$/),
    ]),
    address: new FormControl(''),
    phone: new FormControl('', [
      Validators.pattern(/^\s*(\+?\d[\d\s\-().]{6,14}\d)\s*$/),
    ]),
    email: new FormControl('', [Validators.email]),
    // ⛔️ eliminados 'method_payment' y 'date_paymnet' del root: ahora viven en cada cuota
    cuotas: new FormArray<CuotaFormGroup>([]),
    img: new FormControl(''),
    observations: new FormControl('', [Validators.maxLength(300)]),
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
  isLoading = true;

  // ---------- HELPERS DE CUOTAS ----------
  private buildCuotasArray(
    from: number,
    to: number,
    existing?: CuotaModel[]
  ): FormArray<CuotaFormGroup> {
    const arr = new FormArray<CuotaFormGroup>([]);
    for (let y = from; y >= to; y--) {
      // mismo orden que ya usas (descendiente)
      const found = existing?.find((c) => c.year === y);
      arr.push(this.createCuotaGroup(found ?? { year: y, paid: false }));
    }
    return arr;
  }

  get cuotasFA(): FormArray<CuotaFormGroup> {
    return this.formPartner.get('cuotas') as FormArray<CuotaFormGroup>;
  }

  getCuotaGroupAt(index: number): CuotaFormGroup {
    return this.cuotasFA.at(index) as CuotaFormGroup;
  }

  // Si tu backend viejo trae number[] (años pagados), lo migramos a CuotaModel[]
  private migrateLegacyCuotas(legacyYears: number[]): CuotaModel[] {
    return legacyYears.map((year) => ({
      year,
      paid: true,
      date_payment: null,
      method_payment: null,
    }));
  }

  // ---------- INIT ----------
  ngOnInit(): void {
    this.isLoading = true;

    // p.ej. desde 1995 hasta el año actual, en descendente
    this.years = this.generalService.loadYears(this.currentYear, 1995);

    this.provincias = townsData
      .flatMap((region) => region.provinces)
      .sort((a, b) => a.label.localeCompare(b.label));

    // inicia array vacío (lo rellenamos justo después)
    this.initializeCuotasControls();

    if (this.itemId) {
      this.partnersFacade.loadPartnerById(this.itemId);
      this.partnersFacade.selectedPartner$
        .pipe(
          takeUntilDestroyed(this.destroyRef),
          filter((partner: PartnerModel | null) => partner !== null),
          tap((partner: PartnerModel | null) => {
            if (partner) {
              // provincia/municipios
              const province = this.provincias.find(
                (p) => p.label === partner.province
              );
              this.municipios = province?.towns ?? [];

              this.partnerData = partner;

              // campos simples
              this.formPartner.patchValue(
                {
                  name: partner.name,
                  surname: partner.surname ?? '',
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
                },
                { emitEvent: false }
              );

              // cuotas (aceptamos CuotaModel[] o legacy number[])
              const existingCuotas: CuotaModel[] =
                Array.isArray(partner.cuotas) &&
                typeof partner.cuotas[0] === 'number'
                  ? this.migrateLegacyCuotas(
                      partner.cuotas as unknown as number[]
                    )
                  : (partner.cuotas as CuotaModel[]);

              this.setCuotasForm(existingCuotas);

              this.titleForm = 'Editar Socia';
              this.buttonAction = 'Guardar cambios';

              if (partner.img) {
                this.imageSrc = partner.img;
                this.selectedImageFile = null;
              }
            }
            this.isLoading = false;
          })
        )
        .subscribe();
    } else {
      this.isLoading = false;
    }
  }

  // ---------- UI generales ----------
  onProvinceChange(): void {
    const selectedProvince = this.formPartner.value.province;
    const province = this.provincias.find((p) => p.label === selectedProvince);
    this.municipios = province?.towns ?? [];
    this.formPartner.patchValue({ town: '' });
  }

  async onImageSelected(file: File) {
    const result = await this.generalService.handleFileSelection(file);
    this.selectedImageFile = result.file;
    this.imageSrc = result.imageSrc;
  }

  // (opcional) seteo de método por defecto, útil si tienes botones tipo "CASH/DOMICILIATION"
  setDefaultMethodPayment(type: PaymentMethod | null): void {
    this.defaultMethodPayment = type;
  }

  // ---------- CUOTAS: construir/actualizar ----------
  initializeCuotasControls(): void {
    this.cuotasFA.clear({ emitEvent: false });
    // construimos con años (descendente) sin datos previos
    const built = this.buildCuotasArray(
      this.years[0],
      this.years[this.years.length - 1]
    );
    built.controls.forEach((c) => this.cuotasFA.push(c, { emitEvent: false }));
  }

  setCuotasForm(cuotas: CuotaModel[]): void {
    this.cuotasFA.clear({ emitEvent: false });
    // Construimos tantas cuotas como años visibles en UI, emparejando por 'year'
    const built = this.buildCuotasArray(
      this.years[0],
      this.years[this.years.length - 1],
      cuotas
    );
    built.controls.forEach((c) => this.cuotasFA.push(c, { emitEvent: false }));
  }

  // Helpers para la UI si los necesitas en plantillas (ej. setters por índice)
  setCuotaPaid(index: number, paid: boolean) {
    this.getCuotaGroupAt(index).get('paid')!.setValue(paid);
  }
  setCuotaMethod(index: number, method: PaymentMethod | null) {
    this.getCuotaGroupAt(index).get('method_payment')!.setValue(method);
  }
  setCuotaDate(index: number, isoDate: string | null) {
    this.getCuotaGroupAt(index).get('date_payment')!.setValue(isoDate);
  }

  // ---------- ENVÍO ----------
  onSendFormPartner(): void {
    if (this.formPartner.invalid) {
      this.submitted = true;
      this.formPartner.markAllAsTouched();
      return;
    }

    // Serializamos todas las cuotas visibles (una por año)
    const cuotasToSend: CuotaModel[] = this.cuotasFA.controls.map((fg) => ({
      year: fg.get('year')!.value,
      paid: fg.get('paid')!.value,
      date_payment: fg.get('date_payment')!.value,
      method_payment: fg.get('method_payment')!.value,
    }));

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
    formData.append('death', String(this.formPartner.value.death ?? false));
    formData.append(
      'unsubscribe',
      String(this.formPartner.value.unsubscribe ?? false)
    );

    // ⬇️ cuotas como JSON de CuotaModel[]
    formData.append('cuotas', JSON.stringify(cuotasToSend));

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
      formData,
    });
  }
  observationsLen(): number {
    return (this.formPartner.get('observations')?.value || '').length;
  }
}
