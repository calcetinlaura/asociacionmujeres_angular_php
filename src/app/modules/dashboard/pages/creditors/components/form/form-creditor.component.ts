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
import { SpinnerLoadingComponent } from 'src/app/shared/components/spinner-loading/spinner-loading.component';
import { ScrollToFirstErrorDirective } from 'src/app/shared/directives/scroll-to-first-error.directive';
import { GeneralService } from 'src/app/shared/services/generalService.service';
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
  styleUrls: ['../../../../components/form/form.component.css'],
})
export class FormCreditorComponent {
  private creditorsFacade = inject(CreditorsFacade);
  private destroyRef = inject(DestroyRef);
  private generalService = inject(GeneralService);

  @Input() itemId!: number;
  @Output() submitForm = new EventEmitter<{
    itemId: number;
    formData: FormData;
  }>();

  formCreditor = new FormGroup({
    company: new FormControl('', [Validators.required]),
    cif: new FormControl(''),
    contact: new FormControl(''),
    phone: new FormControl('', [
      // Permite vacío; si hay valor, debe cumplir el patrón
      Validators.pattern(/^\s*(\+?\d[\d\s\-().]{6,14}\d)\s*$/),
    ]),
    email: new FormControl('', [
      // Permite vacío; si hay valor, debe ser email válido
      Validators.email,
    ]),
    province: new FormControl(''),
    town: new FormControl(''),
    address: new FormControl(''),
    post_code: new FormControl('', [
      Validators.pattern(/^(?:0[1-9]|[1-4][0-9]|5[0-2])[0-9]{3}$/),
    ]),
    category: new FormControl(''),
    key_words: new FormControl(''),
    observations: new FormControl(''),
  });

  creditorData: any;
  submitted = false;
  titleForm: string = 'Registrar acreedor/a';
  buttonAction: string = 'Guardar';
  categoryFilterCreditors = categoryFilterCreditors;

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
      this.creditorsFacade.loadCreditorById(this.itemId);
      this.creditorsFacade.selectedCreditor$
        .pipe(
          takeUntilDestroyed(this.destroyRef),
          filter((creditor: CreditorModel | null) => creditor !== null),
          tap((creditor: CreditorModel | null) => {
            if (creditor) {
              // 🔹 Primero actualizamos los municipios basándonos en la provincia recibida
              const province = this.provincias.find(
                (p) => p.label === creditor.province
              );
              this.municipios = province?.towns ?? [];

              // 🔹 Luego seteamos los valores del formulario
              this.formCreditor.patchValue(creditor);

              this.titleForm = 'Editar Acreedor/a';
              this.buttonAction = 'Guardar cambios';
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
    const selectedProvince = this.formCreditor.value.province;
    const province = this.provincias.find((p) => p.label === selectedProvince);
    this.municipios = province?.towns ?? [];
    this.formCreditor.patchValue({ town: '' }); // limpia el municipio
  }

  onSendFormCreditor(): void {
    if (this.formCreditor.invalid) {
      this.submitted = true;
      console.log('Formulario inválido', this.formCreditor.errors);
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

    this.submitForm.emit({ itemId: this.itemId, formData: formData });
  }
}
