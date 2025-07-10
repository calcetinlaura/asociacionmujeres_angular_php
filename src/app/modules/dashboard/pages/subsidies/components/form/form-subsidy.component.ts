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
  FormControl,
  FormGroup,
  ReactiveFormsModule,
  Validators,
} from '@angular/forms';
import {
  MatAutocompleteModule,
  MatAutocompleteSelectedEvent,
} from '@angular/material/autocomplete';
import { MatCardModule } from '@angular/material/card';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatRadioModule } from '@angular/material/radio';

import { filter, tap } from 'rxjs';
import { SubsidiesFacade } from 'src/app/application/subsidies.facade';
import { CreditorModel } from 'src/app/core/interfaces/creditor.interface';
import {
  categoryFilterSubsidies,
  SubsidyModel,
} from 'src/app/core/interfaces/subsidy.interface';
import { TypeList } from 'src/app/core/models/general.model';
import { SubsidiesService } from 'src/app/core/services/subsidies.services';
import { GeneralService } from 'src/app/shared/services/generalService.service';

@Component({
    selector: 'app-form-subsidy',
    imports: [
        CommonModule,
        ReactiveFormsModule,
        MatCheckboxModule,
        MatRadioModule,
        MatAutocompleteModule,
        MatFormFieldModule,
        MatInputModule,
        MatCardModule,
    ],
    templateUrl: './form-subsidy.component.html',
    styleUrls: ['../../../../components/form/form.component.css'],
    providers: [SubsidiesService]
})
export class FormSubsidyComponent implements OnInit {
  private readonly destroyRef = inject(DestroyRef);
  private readonly subsidiesFacade = inject(SubsidiesFacade);
  private readonly generalService = inject(GeneralService);

  @Input() itemId!: number;
  @Output() sendFormSubsidy = new EventEmitter<SubsidyModel>();
  formSubsidy = new FormGroup({
    name: new FormControl(''),
    year: new FormControl(0, [
      Validators.required,
      Validators.min(1995),
      Validators.max(new Date().getFullYear()),
    ]),
    date_presentation: new FormControl<Date | null>(null),
    date_justification: new FormControl<Date | null>(null),
    start: new FormControl<Date | null>(null),
    end: new FormControl<Date | null>(null),
    url_presentation: new FormControl(''),
    url_justification: new FormControl(''),
    amount_requested: new FormControl(),
    amount_granted: new FormControl(),
    amount_justified: new FormControl(),
    amount_association: new FormControl(),
    observations: new FormControl(''),
  });

  errorSession = false;
  submitted = false;
  titleForm = 'Guarda subvención';
  buttonAction = 'Guardar';
  typeList = TypeList.Subsidies;
  years: number[] = [];
  FilterSubsidies = categoryFilterSubsidies;
  creditors: CreditorModel[] = [];
  selectedCreditor?: CreditorModel;
  filteredCreditors: CreditorModel[] = [];
  searchControl = new FormControl();
  showSuggestions: boolean = false;
  searchInput = new FormControl();

  currentYear = this.generalService.currentYear;

  ngOnInit(): void {
    this.years = this.generalService.loadYears(this.currentYear, 2018);

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
      this.submitted = true;
      console.log('Formulario inválido', this.formSubsidy.errors);
      return;
    }

    const formValue: SubsidyModel & { _method?: string; id?: number } = {
      name: this.formSubsidy.get('name')?.value || '',
      year: this.formSubsidy.get('year')?.value || 0,
      date_justification:
        this.formSubsidy.get('date_justification')?.value || null,
      date_presentation:
        this.formSubsidy.get('date_presentation')?.value || null,
      start: this.formSubsidy.get('start')?.value || null,
      end: this.formSubsidy.get('end')?.value || null,
      url_presentation: this.formSubsidy.get('url_presentation')?.value || '',
      url_justification: this.formSubsidy.get('url_justification')?.value || '',
      amount_requested: this.formSubsidy.get('amount_requested')?.value || null,
      amount_granted: this.formSubsidy.get('amount_granted')?.value || null,
      amount_justified: this.formSubsidy.get('amount_justified')?.value || null,
      amount_association:
        this.formSubsidy.get('amount_association')?.value || null,
      observations: this.formSubsidy.get('observations')?.value || '',
    };

    if (this.itemId) {
      formValue._method = 'PATCH'; // Indica que es edición
      formValue.id = this.itemId;
    }

    this.sendFormSubsidy.emit(formValue);
  }
}
