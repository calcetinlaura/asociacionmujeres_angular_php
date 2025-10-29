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
import { QuillModule } from 'ngx-quill';
import { filter, tap } from 'rxjs';

import { SubsidiesFacade } from 'src/app/application/subsidies.facade';
import { CreditorModel } from 'src/app/core/interfaces/creditor.interface';
import {
  categoryFilterSubsidies,
  SubsidyModel,
} from 'src/app/core/interfaces/subsidy.interface';
import { TypeList } from 'src/app/core/models/general.model';
import { GeneralService } from 'src/app/core/services/generalService.service';
import { SubsidiesService } from 'src/app/core/services/subsidies.services';

import { SpinnerLoadingComponent } from 'src/app/shared/components/spinner-loading/spinner-loading.component';
import { ScrollToFirstErrorDirective } from 'src/app/shared/directives/scroll-to-first-error.directive';

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
    MatCardModule,
    QuillModule,
    SpinnerLoadingComponent,
    ScrollToFirstErrorDirective,
  ],
  templateUrl: './form-subsidy.component.html',
  styleUrls: ['./../../../../../../shared/components/form/form.component.css'],
  providers: [SubsidiesService],
})
export class FormSubsidyComponent implements OnInit {
  readonly subsidiesFacade = inject(SubsidiesFacade);
  private readonly destroyRef = inject(DestroyRef);
  private readonly generalService = inject(GeneralService);

  // ────────────────────────────────────────────────────────────────
  // Inputs / Outputs
  // ────────────────────────────────────────────────────────────────
  @Input() itemId!: number;
  @Input() item: SubsidyModel | null = null;
  @Output() submitForm = new EventEmitter<{
    itemId: number;
    formData: FormData;
  }>();

  // ────────────────────────────────────────────────────────────────
  // Estado
  // ────────────────────────────────────────────────────────────────
  formSubsidy = new FormGroup({
    name: new FormControl('', Validators.required),
    year: new FormControl<number | null>(null, [
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
    amount_requested: new FormControl<number | null>(null),
    amount_granted: new FormControl<number | null>(null),
    amount_justified: new FormControl<number | null>(null),
    amount_association: new FormControl<number | null>(null),
    observations: new FormControl('', [Validators.maxLength(1000)]),
  });

  submitted = false;
  titleForm = 'Registrar subvención';
  buttonAction = 'Guardar';
  typeList = TypeList.Subsidies;
  FilterSubsidies = categoryFilterSubsidies;

  years: number[] = [];
  creditors: CreditorModel[] = [];
  filteredCreditors: CreditorModel[] = [];
  selectedCreditor?: CreditorModel;
  searchInput = new FormControl('');

  showSuggestions = false;
  currentYear = this.generalService.currentYear;

  quillModules = this.generalService.defaultQuillModules;

  // ────────────────────────────────────────────────────────────────
  // Lifecycle
  // ────────────────────────────────────────────────────────────────
  ngOnInit(): void {
    this.years = this.generalService.loadYears(this.currentYear, 2018);

    if (this.item) {
      this.patchForm(this.item);
      return;
    }

    if (this.itemId) {
      this.subsidiesFacade.loadSubsidyById(this.itemId);
      this.subsidiesFacade.selectedSubsidy$.pipe(
        takeUntilDestroyed(this.destroyRef),
        filter((s): s is SubsidyModel => !!s),
        tap((s) => this.patchForm(s))
      );
    }
  }

  // ────────────────────────────────────────────────────────────────
  // Helpers de carga
  // ────────────────────────────────────────────────────────────────
  private patchForm(subsidy: SubsidyModel): void {
    this.formSubsidy.patchValue({
      name: subsidy.name ?? '',
      year: subsidy.year ?? null,
      date_presentation: subsidy.date_presentation ?? null,
      date_justification: subsidy.date_justification ?? null,
      start: subsidy.start ?? null,
      end: subsidy.end ?? null,
      url_presentation: subsidy.url_presentation ?? '',
      url_justification: subsidy.url_justification ?? '',
      amount_requested: subsidy.amount_requested ?? null,
      amount_granted: subsidy.amount_granted ?? null,
      amount_justified: subsidy.amount_justified ?? null,
      amount_association: subsidy.amount_association ?? null,
      observations: subsidy.observations ?? '',
    });

    this.setEditModeDisabledFields(true);
    this.titleForm = 'Editar subvención';
    this.buttonAction = 'Guardar cambios';
  }

  private setEditModeDisabledFields(isEdit: boolean): void {
    const fieldsToToggle = ['name', 'year'] as const;
    for (const field of fieldsToToggle) {
      const control = this.formSubsidy.get(field);
      if (isEdit) control?.disable({ emitEvent: false });
      else control?.enable({ emitEvent: false });
    }
  }

  // ────────────────────────────────────────────────────────────────
  // Autocompletado de acreedores
  // ────────────────────────────────────────────────────────────────
  onSelectedOption(event: MatAutocompleteSelectedEvent): void {
    const creditor: CreditorModel | undefined = event.option.value;
    this.selectedCreditor = creditor ?? undefined;
    this.searchInput.setValue(creditor ? creditor.company : '');
  }

  hideSuggestions(): void {
    setTimeout(() => (this.showSuggestions = false), 100);
  }

  // ────────────────────────────────────────────────────────────────
  // Envío
  // ────────────────────────────────────────────────────────────────
  onSendFormSubsidy(): void {
    if (this.formSubsidy.invalid) {
      this.submitted = true;
      this.formSubsidy.markAllAsTouched();
      return;
    }

    const rawValues = { ...this.formSubsidy.getRawValue() };

    if (rawValues.observations)
      rawValues.observations = rawValues.observations.replace(/&nbsp;/g, ' ');

    const formData = this.generalService.createFormData(
      rawValues,
      {},
      this.itemId
    );

    this.submitForm.emit({ itemId: this.itemId, formData });
  }

  // ────────────────────────────────────────────────────────────────
  // Utilidades
  // ────────────────────────────────────────────────────────────────
  observationsLen(): number {
    return (this.formSubsidy.get('observations')?.value || '').length;
  }
}
