import { CommonModule } from '@angular/common';
import {
  Component,
  DestroyRef,
  EventEmitter,
  inject,
  Input,
  Output,
} from '@angular/core';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatRadioModule } from '@angular/material/radio';
import {
  FormControl,
  FormGroup,
  ReactiveFormsModule,
  Validators,
} from '@angular/forms';
import { filter, tap } from 'rxjs';
import { filterSubsidies } from 'src/app/core/models/general.model';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import {
  MatAutocompleteModule,
  MatAutocompleteSelectedEvent,
} from '@angular/material/autocomplete';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { CreditorModel } from 'src/app/core/interfaces/creditor.interface';
import { EditorModule } from '@tinymce/tinymce-angular';
import { MatCardModule } from '@angular/material/card';
import { SubsidyModel } from 'src/app/core/interfaces/subsidy.interface';
import { SubsidiesFacade } from 'src/app/application/subsidies.facade';
import { SubsidiesService } from 'src/app/core/services/subsidies.services';
import { GeneralService } from 'src/app/shared/services/generalService.service';

@Component({
  selector: 'app-form-subsidy',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatCheckboxModule,
    MatRadioModule,
    MatAutocompleteModule,
    MatFormFieldModule,
    MatInputModule,
    EditorModule,
    MatCardModule,
  ],
  templateUrl: './form-subsidy.component.html',
  styleUrls: ['../../../../components/form/form.component.css'],
  providers: [SubsidiesService],
})
export class FormSubsidyComponent {
  private destroyRef = inject(DestroyRef);
  private subsidiesFacade = inject(SubsidiesFacade);
  private generalService = inject(GeneralService);

  @Input() itemId!: number;
  @Output() sendFormSubsidy = new EventEmitter<SubsidyModel>();
  imageSrc: string = '';
  errorSession: boolean = false;
  submitted: boolean = false;
  titleForm: string = 'Registrar subvención';
  buttonAction: string = 'Guardar';
  years: number[] = [];
  FilterSubsidies = filterSubsidies;
  creditors: CreditorModel[] = [];
  selectedCreditor?: CreditorModel;
  filteredCreditors: CreditorModel[] = [];
  searchControl = new FormControl();
  showSuggestions: boolean = false;
  searchInput = new FormControl();

  formSubsidy = new FormGroup({
    name: new FormControl(''),
    year: new FormControl(0, [
      Validators.required,
      Validators.min(1995),
      Validators.max(new Date().getFullYear()),
    ]),
    datePresentation: new FormControl<Date | null>(null),
    dateJustification: new FormControl<Date | null>(null),
    periodStart: new FormControl<Date | null>(null),
    periodEnd: new FormControl<Date | null>(null),
    activities: new FormControl(''),
    invoices: new FormControl(''),
    urlPresentation: new FormControl(''),
    urlJustification: new FormControl(''),
    amountRequested: new FormControl(),
    amountGranted: new FormControl(),
    amountJustified: new FormControl(),
    amountAssociation: new FormControl(),
    observations: new FormControl(''),
  });

  ngOnInit(): void {
    const currentYear = this.generalService.currentYear;
    this.years = this.generalService.loadYears(currentYear, 2018);

    if (this.itemId) {
      this.subsidiesFacade.loadSubsidyById(this.itemId);
      this.subsidiesFacade.selectedSubsidy$
        .pipe(
          takeUntilDestroyed(this.destroyRef),
          filter((subsidy: SubsidyModel | null) => subsidy !== null),
          tap((subsidy: SubsidyModel | null) => {
            if (subsidy) {
              this.formSubsidy.patchValue(subsidy);
              this.titleForm = 'Editar Subvención';
              this.buttonAction = 'Guardar cambios';
            }
          })
        )
        .subscribe();
    }
  }

  onSelectedOption(event: MatAutocompleteSelectedEvent): void {
    if (!event.option.value) {
      this.selectedCreditor = undefined;
      return;
    }
    const creditor: CreditorModel = event.option.value;
    this.searchInput.setValue(creditor.company);
    this.selectedCreditor = creditor;
  }

  // Maneja el evento de ocultar sugerencias al perder el foco
  hideSuggestions(): void {
    setTimeout(() => {
      this.showSuggestions = false; // Permitir que el clic se registre
    }, 100);
  }

  onSendFormInvoice(): void {
    if (this.formSubsidy.invalid) {
      this.submitted = true; // Marcar como enviado
      return;
    }

    const formValue: SubsidyModel = {
      name: this.formSubsidy.get('name')?.value || '',
      year: this.formSubsidy.get('year')?.value || 0,
      dateJustification:
        this.formSubsidy.get('dateJustification')?.value || null,
      datePresentation: this.formSubsidy.get('datePresentation')?.value || null,
      periodStart: this.formSubsidy.get('periodStart')?.value || null,
      periodEnd: this.formSubsidy.get('periodEnd')?.value || null,
      activities: this.formSubsidy.get('activities')?.value || '',
      invoices: this.formSubsidy.get('invoices')?.value || '',
      urlPresentation: this.formSubsidy.get('urlPresentation')?.value || '',
      urlJustification: this.formSubsidy.get('urlJustification')?.value || '',
      amountRequested: this.formSubsidy.get('amountRequested')?.value || null,
      amountGranted: this.formSubsidy.get('amountGranted')?.value || null,
      amountJustified: this.formSubsidy.get('amountJustified')?.value || null,
      amountAssociation:
        this.formSubsidy.get('amountAssociation')?.value || null,
      observations: this.formSubsidy.get('observations')?.value || '',
    };
    this.sendFormSubsidy.emit(formValue);
  }
}
