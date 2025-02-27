import { CommonModule } from '@angular/common';
import { Component, EventEmitter, inject, Input, Output } from '@angular/core';
import {
  AbstractControl,
  FormControl,
  FormGroup,
  ReactiveFormsModule,
  Validators,
} from '@angular/forms';
import { filter, tap } from 'rxjs';
import { PiterasFacade } from 'src/app/application';
import { PiteraModel } from 'src/app/core/interfaces/pitera.interface';
import { PiterasService } from 'src/app/core/services/piteras.services';
import { GeneralService } from 'src/app/shared/services/generalService.service';

@Component({
  selector: 'app-form-pitera',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './form-pitera.component.html',
  styleUrls: ['../../../../components/form/form.component.css'],
  providers: [PiterasService],
})
export class FormPiteraComponent {
  private generalService = inject(GeneralService);

  @Input() itemId!: number;
  @Output() sendFormPitera = new EventEmitter<PiteraModel>();

  piteraData: any;
  imageSrc: string = '';
  errorSession: boolean = false;
  submitted: boolean = false;
  titleForm: string = 'Registrar Pitera';
  buttonAction: string = 'Guardar';
  years: number[] = [];

  formPitera = new FormGroup({
    title: new FormControl('', [Validators.required]),
    theme: new FormControl(''),
    url: new FormControl(''),
    img: new FormControl(''),
    year: new FormControl(0, [
      Validators.required,
      Validators.min(1995),
      Validators.max(new Date().getFullYear()),
    ]),
    // file: new FormControl(''),
    // fileSource: new FormControl(''),
  });

  private piterasFacade = inject(PiterasFacade);

  ngOnInit(): void {
    const currentYear = this.generalService.currentYear;
    this.years = this.generalService.loadYears(currentYear, 1995);

    if (this.itemId) {
      this.piterasFacade.loadPiteraById(this.itemId);
      this.piterasFacade.selectedPitera$
        .pipe(
          filter((pitera: PiteraModel | null) => pitera !== null),
          tap((pitera: PiteraModel | null) => {
            if (pitera) {
              this.formPitera.patchValue(pitera);
              this.titleForm = 'Editar Pitera';
              this.buttonAction = 'Guardar cambios';
            }
          })
        )
        .subscribe();
    }
  }

  onSendFormPitera(): void {
    if (this.formPitera.invalid) {
      this.submitted = true; // Marcar como enviado
      return;
    }

    const formValue: PiteraModel = {
      title: this.formPitera.get('title')?.value || '',
      theme: this.formPitera.get('theme')?.value || '',
      url: this.formPitera.get('url')?.value || '',
      img: this.formPitera.get('img')?.value || '',
      year: this.formPitera.get('year')?.value || 0,
    };
    this.sendFormPitera.emit(formValue);
  }
}
