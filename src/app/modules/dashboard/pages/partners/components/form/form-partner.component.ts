import { CommonModule } from '@angular/common';
import {
  Component,
  DestroyRef,
  EventEmitter,
  inject,
  Input,
  OnInit,
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
import { GeneralService } from 'src/app/core/services/generalService.service';
import { ImageControlComponent } from 'src/app/shared/components/image-control/image-control.component';
import { SpinnerLoadingComponent } from 'src/app/shared/components/spinner-loading/spinner-loading.component';
import { ScrollToFirstErrorDirective } from 'src/app/shared/directives/scroll-to-first-error.directive';

type CuotaForm = {
  year: FormControl<number>;
  paid: FormControl<boolean>;
  date_payment: FormControl<string | null>;
  method_payment: FormControl<PaymentMethod | null>;
};
type CuotaFormGroup = FormGroup<CuotaForm>;

@Component({
  selector: 'app-form-partner',
  standalone: true,
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
export class FormPartnerComponent implements OnInit {
  readonly partnersFacade = inject(PartnersFacade);
  private readonly destroyRef = inject(DestroyRef);
  private readonly generalService = inject(GeneralService);

  @Input() itemId!: number;
  @Input() item: PartnerModel | null = null;

  @Output() submitForm = new EventEmitter<{
    itemId: number;
    formData: FormData;
  }>();

  selectedImageFile: File | null = null;
  imageSrc = '';
  submitted = false;
  titleForm = 'Registrar socia';
  buttonAction = 'Guardar';
  years: number[] = [];
  typeList = TypeList.Partners;

  defaultMethodPayment: PaymentMethod | null = null;
  PaymentMethod = {
    CASH: 'cash' as PaymentMethod,
    DOMICILIATION: 'domiciliation' as PaymentMethod,
  };

  provincias: {
    label: string;
    code: string;
    towns: { label: string; code: string }[];
  }[] = [];
  municipios: { label: string; code: string }[] = [];
  currentYear = this.generalService.currentYear;

  // ======== Form principal =========
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
    cuotas: new FormArray<CuotaFormGroup>([]),
    img: new FormControl(''),
    observations: new FormControl('', [Validators.maxLength(300)]),
    death: new FormControl(false),
    unsubscribe: new FormControl(false),
  });

  // ========= Cuotas helpers =========
  private createCuotaGroup(seed: Partial<CuotaModel>): CuotaFormGroup {
    const fg = new FormGroup<CuotaForm>({
      year: new FormControl(seed.year ?? this.currentYear, {
        nonNullable: true,
      }),
      paid: new FormControl(!!seed.paid, { nonNullable: true }),
      date_payment: new FormControl(seed.date_payment ?? null),
      method_payment: new FormControl(seed.method_payment ?? null),
    });

    const toggle = (isPaid: boolean) => {
      const dc = fg.get('date_payment')!;
      const mc = fg.get('method_payment')!;
      if (isPaid) {
        dc.enable({ emitEvent: false });
        mc.enable({ emitEvent: false });
      } else {
        dc.disable({ emitEvent: false });
        mc.disable({ emitEvent: false });
      }
    };
    toggle(fg.get('paid')!.value);
    fg.get('paid')!.valueChanges.subscribe(toggle);

    return fg;
  }

  get cuotasFA(): FormArray<CuotaFormGroup> {
    return this.formPartner.get('cuotas') as FormArray<CuotaFormGroup>;
  }

  getCuotaGroupAt(index: number): CuotaFormGroup {
    return this.cuotasFA.at(index) as CuotaFormGroup;
  }

  private buildCuotasArray(
    from: number,
    to: number,
    existing?: CuotaModel[]
  ): FormArray<CuotaFormGroup> {
    const arr = new FormArray<CuotaFormGroup>([]);
    for (let y = from; y >= to; y--) {
      const found = existing?.find((c) => c.year === y);
      arr.push(this.createCuotaGroup(found ?? { year: y, paid: false }));
    }
    return arr;
  }

  private migrateLegacyCuotas(legacyYears: number[]): CuotaModel[] {
    return legacyYears.map((year) => ({
      year,
      paid: true,
      date_payment: null,
      method_payment: null,
    }));
  }

  // ======== INIT =========
  ngOnInit(): void {
    this.years = this.generalService.loadYears(this.currentYear, 1995);
    this.provincias = townsData
      .flatMap((r) => r.provinces)
      .sort((a, b) => a.label.localeCompare(b.label));
    this.initializeCuotasControls();

    if (this.item) {
      this.patchForm(this.item);
      return;
    }

    if (this.itemId) {
      this.partnersFacade.loadPartnerById(this.itemId);
      this.partnersFacade.selectedPartner$
        .pipe(
          takeUntilDestroyed(this.destroyRef),
          filter((p): p is PartnerModel => !!p),
          tap((partner) => {
            this.patchForm(partner);
          })
        )
        .subscribe();
    }
  }

  // ========= Patch =========
  private patchForm(partner: PartnerModel): void {
    const province = this.provincias.find((p) => p.label === partner.province);
    this.municipios = province?.towns ?? [];

    this.formPartner.patchValue({
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
    });

    const existingCuotas: CuotaModel[] = (partner.cuotas ?? []) as CuotaModel[];
    this.setCuotasForm(existingCuotas);

    this.setCuotasForm(existingCuotas);

    this.titleForm = 'Editar socia';
    this.buttonAction = 'Guardar cambios';

    if (partner.img) {
      this.imageSrc = partner.img;
      this.selectedImageFile = null;
    }
  }

  // ========= Cuotas =========
  initializeCuotasControls(): void {
    this.cuotasFA.clear({ emitEvent: false });
    const built = this.buildCuotasArray(
      this.years[0],
      this.years[this.years.length - 1]
    );
    built.controls.forEach((c) => this.cuotasFA.push(c, { emitEvent: false }));
  }

  setCuotasForm(cuotas: CuotaModel[]): void {
    this.cuotasFA.clear({ emitEvent: false });
    const built = this.buildCuotasArray(
      this.years[0],
      this.years[this.years.length - 1],
      cuotas
    );
    built.controls.forEach((c) => this.cuotasFA.push(c, { emitEvent: false }));
  }

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

  // ========= Envío =========
  onSendFormPartner(): void {
    if (this.formPartner.invalid) {
      this.submitted = true;
      this.formPartner.markAllAsTouched();
      return;
    }

    const cuotasToSend: CuotaModel[] = this.cuotasFA.controls.map((fg) => ({
      year: fg.get('year')!.value,
      paid: fg.get('paid')!.value,
      date_payment: fg.get('date_payment')!.value,
      method_payment: fg.get('method_payment')!.value,
    }));

    const rawValues = {
      ...this.formPartner.getRawValue(),
      cuotas: cuotasToSend,
    };

    const formData = this.generalService.createFormData(
      rawValues,
      { img: this.selectedImageFile },
      this.itemId
    );

    this.submitForm.emit({ itemId: this.itemId, formData });
  }

  observationsLen(): number {
    return (this.formPartner.get('observations')?.value || '').length;
  }
}
