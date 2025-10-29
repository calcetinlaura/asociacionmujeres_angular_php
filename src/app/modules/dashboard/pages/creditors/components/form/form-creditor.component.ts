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
  FormControl,
  FormGroup,
  ReactiveFormsModule,
  Validators,
} from '@angular/forms';

import townsData from 'data/towns.json';
import { QuillModule } from 'ngx-quill';
import { filter, tap } from 'rxjs';
import { CreditorsFacade } from 'src/app/application/creditors.facade';
import {
  categoryFilterCreditors,
  CreditorModel,
} from 'src/app/core/interfaces/creditor.interface';
import { TypeList } from 'src/app/core/models/general.model';
import { GeneralService } from 'src/app/core/services/generalService.service';
import { SpinnerLoadingComponent } from 'src/app/shared/components/spinner-loading/spinner-loading.component';
import { ScrollToFirstErrorDirective } from 'src/app/shared/directives/scroll-to-first-error.directive';

@Component({
  selector: 'app-form-creditor',
  imports: [
    CommonModule,
    ReactiveFormsModule,
    QuillModule,
    SpinnerLoadingComponent,
    ScrollToFirstErrorDirective,
  ],
  templateUrl: './form-creditor.component.html',
  styleUrls: ['./../../../../../../shared/components/form/form.component.css'],
})
export class FormCreditorComponent {
  readonly creditorsFacade = inject(CreditorsFacade);
  private readonly destroyRef = inject(DestroyRef);
  private readonly generalService = inject(GeneralService);

  @Input() itemId!: number;
  @Input() item: CreditorModel | null = null;
  @Output() submitForm = new EventEmitter<{
    itemId: number;
    formData: FormData;
  }>();

  formCreditor = new FormGroup({
    company: new FormControl('', [Validators.required]),
    cif: new FormControl(''),
    contact: new FormControl(''),
    phone: new FormControl('', [
      Validators.pattern(/^\s*(\+?\d[\d\s\-().]{6,14}\d)\s*$/),
    ]),
    email: new FormControl('', [Validators.email]),
    province: new FormControl(''),
    town: new FormControl(''),
    address: new FormControl(''),
    post_code: new FormControl('', [
      Validators.pattern(/^(?:0[1-9]|[1-4][0-9]|5[0-2])[0-9]{3}$/),
    ]),
    category: new FormControl(''),
    key_words: new FormControl(''),
    observations: new FormControl('', [Validators.maxLength(300)]),
  });

  submitted = false;
  titleForm = 'Registrar acreedor/a';
  buttonAction = 'Guardar';
  categoryFilterCreditors = categoryFilterCreditors;
  typeList = TypeList.Creditors;

  provincias: {
    label: string;
    code: string;
    towns: { label: string; code: string }[];
  }[] = [];
  municipios: { label: string; code: string }[] = [];

  quillModules = this.generalService.defaultQuillModules;

  ngOnInit(): void {
    this.provincias = townsData
      .flatMap((region) => region.provinces)
      .sort((a, b) => a.label.localeCompare(b.label));

    // ✅ Caso 1: Si llega el item completo desde la modal
    if (this.item) {
      this.patchForm(this.item);
      return;
    }

    // ✅ Caso 2: carga por ID
    if (this.itemId) {
      this.creditorsFacade.loadCreditorById(this.itemId);
      this.creditorsFacade.selectedCreditor$
        .pipe(
          takeUntilDestroyed(this.destroyRef),
          filter((creditor: CreditorModel | null) => !!creditor),
          tap((creditor: CreditorModel | null) => {
            if (creditor) {
              this.patchForm(creditor);
            }
          })
        )
        .subscribe();
    }
  }

  private patchForm(creditor: CreditorModel) {
    // Cargar municipios de la provincia
    const province = this.provincias.find((p) => p.label === creditor.province);
    this.municipios = province?.towns ?? [];

    this.formCreditor.patchValue(creditor);

    this.titleForm = 'Editar acreedor/a';
    this.buttonAction = 'Guardar cambios';
  }

  onProvinceChange(): void {
    const selectedProvince = this.formCreditor.value.province;
    const province = this.provincias.find((p) => p.label === selectedProvince);
    this.municipios = province?.towns ?? [];
    this.formCreditor.patchValue({ town: '' });
  }

  onSendFormCreditor(): void {
    if (this.formCreditor.invalid) {
      this.submitted = true;
      console.warn('Formulario inválido', this.formCreditor.errors);
      return;
    }

    const rawValues = { ...this.formCreditor.getRawValue() } as any;

    if (rawValues.observations) {
      rawValues.observations = rawValues.observations.replace(/&nbsp;/g, ' ');
    }

    const formData = this.generalService.createFormData(
      rawValues,
      {},
      this.itemId
    );
    this.submitForm.emit({ itemId: this.itemId, formData });
  }

  observationsLen(): number {
    return (this.formCreditor.get('observations')?.value || '').length;
  }
}
