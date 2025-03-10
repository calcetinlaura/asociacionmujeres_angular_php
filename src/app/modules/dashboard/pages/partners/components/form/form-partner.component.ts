import { CommonModule } from '@angular/common';
import { Component, EventEmitter, inject, Input, Output } from '@angular/core';
import {
  FormArray,
  FormControl,
  FormGroup,
  ReactiveFormsModule,
  Validators,
} from '@angular/forms';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { filter, tap } from 'rxjs';
import { PartnersFacade } from 'src/app/application';
import { PartnerModel } from 'src/app/core/interfaces/partner.interface';
import { GeneralService } from 'src/app/shared/services/generalService.service';

@Component({
  selector: 'app-form-partner',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, MatCheckboxModule],
  templateUrl: './form-partner.component.html',
  styleUrls: ['../../../../components/form/form.component.css'],
})
export class FormPartnerComponent {
  private partnersFacade = inject(PartnersFacade);
  private generalService = inject(GeneralService);

  @Input() itemId!: number;
  @Output() sendFormPartner = new EventEmitter<{
    itemId: number;
    newPartnerData: PartnerModel;
  }>();

  partnerData: PartnerModel | null = null;
  errorSession: boolean = false;
  submitted: boolean = false;
  titleForm: string = 'Registrar socia';
  buttonAction: string = 'Guardar';
  years: number[] = [];

  formPartner = new FormGroup({
    name: new FormControl('', [Validators.required]),
    surname: new FormControl(''),
    birthday: new FormControl(''),
    post_code: new FormControl(''),
    address: new FormControl(''),
    phone: new FormControl(''),
    email: new FormControl(''),
    town: new FormControl(''),
    cuotas: new FormArray([]), // FormArray para checkboxes dinámicos
  });

  ngOnInit(): void {
    const currentYear = new Date().getFullYear();
    this.years = this.generalService.loadYears(currentYear, 1995);

    // Inicializa los checkboxes como vacíos al principio
    this.initializeCuotasControls();

    if (this.itemId) {
      this.titleForm = 'Editar Socia';
      this.buttonAction = 'Guardar cambios';

      this.partnersFacade.loadPartnerById(this.itemId);
      this.partnersFacade.selectedPartner$
        .pipe(
          filter((partner: PartnerModel | null) => partner !== null),
          tap((partner: PartnerModel | null) => {
            if (partner) {
              this.partnerData = partner;
              this.formPartner.patchValue({
                name: partner.name,
                surname: partner.surname,
                birthday: partner.birthday || '',
                post_code: partner.post_code || '',
                address: partner.address || '',
                phone: partner.phone || '',
                email: partner.email || '',
                town: partner.town || '',
              });

              // Marcar cuotas si existen en la base de datos
              this.setCuotasForm(partner.cuotas || []);
            }
          })
        )
        .subscribe();
    }
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

    // Filtrar los años seleccionados
    const selectedCuotas = this.years.filter(
      (_, index) =>
        (this.formPartner.get('cuotas') as FormArray).at(index).value
    );

    const newPartnerData: PartnerModel = {
      id: this.itemId || 0,
      name: this.formPartner.value.name!,
      surname: this.formPartner.value.surname!,
      birthday: this.formPartner.value.birthday || '',
      post_code: this.formPartner.value.post_code || '',
      address: this.formPartner.value.address || '',
      phone: this.formPartner.value.phone!,
      email: this.formPartner.value.email || '',
      town: this.formPartner.value.town || '',
      cuotas: selectedCuotas,
    };

    this.sendFormPartner.emit({
      itemId: this.itemId,
      newPartnerData: newPartnerData,
    });
  }
}
