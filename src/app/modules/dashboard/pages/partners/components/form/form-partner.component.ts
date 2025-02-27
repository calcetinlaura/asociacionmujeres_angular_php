import { CommonModule } from '@angular/common';
import { Component, EventEmitter, inject, Input, Output } from '@angular/core';
import {
  AbstractControl,
  FormControl,
  FormGroup,
  ReactiveFormsModule,
  Validators,
} from '@angular/forms';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { filter, tap } from 'rxjs';
import { PartnersFacade } from 'src/app/application';
import { PartnerModel } from 'src/app/core/interfaces/partner.interface';
import { PartnersService } from 'src/app/core/services/partners.services';
import { GeneralService } from 'src/app/shared/services/generalService.service';

@Component({
  selector: 'app-form-partner',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, MatCheckboxModule],
  templateUrl: './form-partner.component.html',
  styleUrls: ['../../../../components/form/form.component.css'],
  providers: [PartnersService],
})
export class FormPartnerComponent {
  private partnersFacade = inject(PartnersFacade);
  private generalService = inject(GeneralService);

  @Input() itemId!: number;
  @Output() sendFormPartner = new EventEmitter<PartnerModel>();

  partnerData: any;
  imageSrc: string = '';
  errorSession: boolean = false;
  submitted: boolean = false;
  titleForm: string = 'Registrar socia';
  buttonAction: string = 'Guardar';
  years: number[] = [];
  formPartner: FormGroup;

  constructor() {
    this.formPartner = new FormGroup({
      name: new FormControl('', [Validators.required]),
      surname: new FormControl(''),
      birthday: new FormControl(''),
      postCode: new FormControl(''),
      address: new FormControl(''),
      phone: new FormControl(''),
      email: new FormControl(''),
      town: new FormControl(''),
      img: new FormControl(''),
    });
  }

  ngOnInit(): void {
    const currentYear = this.generalService.currentYear;
    this.years = this.generalService.loadYears(currentYear, 1995);
    this.initializeFormControls();

    if (this.itemId) {
      this.partnersFacade.loadPartnerById(this.itemId);
      this.partnersFacade.selectedPartner$
        .pipe(
          filter((partner: PartnerModel | null) => partner !== null),
          tap((partner: PartnerModel | null) => {
            if (partner) {
              this.formPartner.patchValue({
                ...partner,
              });
              this.years.forEach((year) => {
                if (partner.cuotas.includes(year)) {
                  this.formPartner.get(`cuota_${year}`)?.setValue(true); // Marca las casillas correspondientes
                } else {
                  this.formPartner.get(`cuota_${year}`)?.setValue(false);
                }
              });
              this.titleForm = 'Editar Socia';
              this.buttonAction = 'Guardar cambios';
              this.setCuotasForm(partner.cuotas || []);
            }
          })
        )
        .subscribe();
    }
  }

  initializeFormControls(): void {
    this.years.forEach((year) => {
      this.formPartner.addControl(`cuota_${year}`, new FormControl(false));
    });
  }

  setCuotasForm(cuotas: number[]): void {
    cuotas.forEach((year) => {
      if (this.formPartner.contains(`cuota_${year}`)) {
        this.formPartner.get(`cuota_${year}`)?.setValue(true);
      }
    });
  }

  onSendFormPartner(): void {
    if (this.formPartner.invalid) {
      this.submitted = true; // Marcar como enviado
      return;
    }
    const selectedCuotas = this.years.filter(
      (year) => this.formPartner.get(`cuota_${year}`)?.value
    );

    const formValue: PartnerModel = {
      name: this.formPartner.get('name')?.value || '',
      surname: this.formPartner.get('surname')?.value || '',
      birthday: this.formPartner.get('birthday')?.value || '',
      postCode: this.formPartner.get('postCode')?.value || '',
      address: this.formPartner.get('address')?.value || '',
      phone: this.formPartner.get('phone')?.value || '',
      email: this.formPartner.get('email')?.value || '',
      town: this.formPartner.get('town')?.value || '',
      img: this.formPartner.get('img')?.value || '',
      cuotas: selectedCuotas,
    };
    this.sendFormPartner.emit(formValue);
  }
}
