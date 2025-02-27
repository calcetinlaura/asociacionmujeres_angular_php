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
import { filter, tap } from 'rxjs';
import { CreditorsFacade } from 'src/app/application';
import { CreditorModel } from 'src/app/core/interfaces/creditor.interface';
import { CreditorsService } from 'src/app/core/services/creditors.services';

@Component({
  selector: 'app-form-creditor',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './form-creditor.component.html',
  styleUrls: ['../../../../components/form/form.component.css'],
  providers: [CreditorsService],
})
export class FormCreditorComponent {
  private creditorsFacade = inject(CreditorsFacade);
  private destroyRef = inject(DestroyRef);

  @Input() itemId!: number;
  @Output() sendFormCreditor = new EventEmitter<CreditorModel>();

  creditorData: any;
  imageSrc: string = '';
  errorSession: boolean = false;
  submitted: boolean = false;
  titleForm: string = 'Registrar acredor/a';
  buttonAction: string = 'Guardar';
  years: number[] = [];

  formCreditor = new FormGroup({
    company: new FormControl('', [Validators.required]),
    cif: new FormControl(''),
    contact: new FormControl(''),
    phone: new FormControl(''),
    email: new FormControl(''),
    town: new FormControl(''),
    address: new FormControl(''),
    postCode: new FormControl(''),
  });

  private creditorId!: number;

  ngOnInit(): void {
    if (this.itemId) {
      this.creditorsFacade.loadCreditorById(this.itemId);
      this.creditorsFacade.selectedCreditor$
        .pipe(
          takeUntilDestroyed(this.destroyRef),
          filter((creditor: CreditorModel | null) => creditor !== null),
          tap((creditor: CreditorModel | null) => {
            if (creditor) {
              this.formCreditor.patchValue(creditor);
              this.creditorId = creditor.id;
              this.titleForm = 'Editar Acreedor/a';
              this.buttonAction = 'Guardar cambios';
            }
          })
        )
        .subscribe();
    }
  }

  onSendFormCreditor(): void {
    if (this.formCreditor.invalid) {
      this.submitted = true; // Marcar como enviado
      return;
    }

    const formValue: CreditorModel = {
      id: this.creditorId,
      company: this.formCreditor.get('company')?.value || '',
      cif: this.formCreditor.get('cif')?.value || '',
      contact: this.formCreditor.get('contact')?.value || '',
      phone: this.formCreditor.get('phone')?.value || '',
      email: this.formCreditor.get('email')?.value || '',
      town: this.formCreditor.get('town')?.value || '',
      address: this.formCreditor.get('address')?.value || '',
      postCode: this.formCreditor.get('postCode')?.value || '',
    };

    this.sendFormCreditor.emit(formValue);
  }
}
