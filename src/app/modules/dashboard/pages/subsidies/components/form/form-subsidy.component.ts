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
import { SubsidiesService } from 'src/app/core/services/subsidies.services';
import { SpinnerLoadingComponent } from 'src/app/shared/components/spinner-loading/spinner-loading.component';
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
    QuillModule,
    SpinnerLoadingComponent,
  ],
  templateUrl: './form-subsidy.component.html',
  styleUrls: ['../../../../components/form/form.component.css'],
  providers: [SubsidiesService],
})
export class FormSubsidyComponent implements OnInit {
  private readonly destroyRef = inject(DestroyRef);
  private readonly subsidiesFacade = inject(SubsidiesFacade);
  private readonly generalService = inject(GeneralService);

  @Input() itemId!: number;
  @Output() submitForm = new EventEmitter<{
    itemId: number;
    formData: FormData;
  }>();

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
    observations: new FormControl(''),
  });

  submitted = false;
  titleForm = 'Registrar subvención';
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
              this.setEditModeDisabledFields(true);
              this.titleForm = 'Editar Subvención';
              this.buttonAction = 'Guardar cambios';
            }
            this.isLoading = false;
          })
        )
        .subscribe();
    } else {
      this.setEditModeDisabledFields(false);
      this.isLoading = false;
    }
  }
  private setEditModeDisabledFields(isEdit: boolean) {
    const nameCtrl = this.formSubsidy.get('name');
    const yearCtrl = this.formSubsidy.get('year');

    if (isEdit) {
      nameCtrl?.disable({ emitEvent: false });
      yearCtrl?.disable({ emitEvent: false });
    } else {
      nameCtrl?.enable({ emitEvent: false });
      yearCtrl?.enable({ emitEvent: false });
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

  onSendFormSubsidy(): void {
    if (this.formSubsidy.invalid) {
      this.submitted = true;
      console.log('Formulario inválido', this.formSubsidy.errors);
      return;
    }

    const rawValues = { ...this.formSubsidy.getRawValue() } as any;

    if (typeof rawValues.observations === 'string') {
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
