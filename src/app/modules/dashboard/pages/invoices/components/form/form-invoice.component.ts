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
import {
  MatAutocompleteModule,
  MatAutocompleteSelectedEvent,
} from '@angular/material/autocomplete';
import { MatCardModule } from '@angular/material/card';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatRadioModule } from '@angular/material/radio';
import { EditorModule } from '@tinymce/tinymce-angular';
import { filter, map, Observable, tap, throwError } from 'rxjs';
import { InvoicesFacade } from 'src/app/application/invoices.facade';
import {
  CreditorAutocompleteModel,
  CreditorModel,
} from 'src/app/core/interfaces/creditor.interface';
import { InvoiceWithCreditorModel } from 'src/app/core/interfaces/invoice.interface';
import { categoryFilterSubsidies } from 'src/app/core/interfaces/subsidy.interface';
import { CreditorsService } from 'src/app/core/services/creditors.services';
import { GeneralService } from 'src/app/shared/services/generalService.service';

@Component({
  selector: 'app-form-invoice',
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
  templateUrl: './form-invoice.component.html',
  styleUrls: ['../../../../components/form/form.component.css'],
})
export class FormInvoiceComponent {
  private destroyRef = inject(DestroyRef);
  private invoicesFacade = inject(InvoicesFacade);
  private generalService = inject(GeneralService);
  private creditorsService = inject(CreditorsService);

  @Input() itemId!: number;
  @Output() sendFormInvoice = new EventEmitter<{
    itemId: number;
    newInvoiceData: FormData;
  }>();
  invoiceData: any;
  imageSrc: string = '';
  errorSession: boolean = false;
  submitted: boolean = false;
  titleForm: string = 'Registrar factura';
  buttonAction: string = 'Guardar';
  years: number[] = [];
  FilterSubsidies = categoryFilterSubsidies;
  creditors: CreditorModel[] = [];
  selectedCreditor?: CreditorAutocompleteModel;
  filteredCreditors: CreditorModel[] = [];
  searchControl = new FormControl();
  showSuggestions: boolean = false;
  searchInput = new FormControl();

  formInvoice = new FormGroup({
    number_invoice: new FormControl(''),
    type_invoice: new FormControl('', [Validators.required]),
    date_invoice: new FormControl('', [Validators.required]), // String para el input de tipo date
    date_accounting: new FormControl(''),
    date_payment: new FormControl(''),
    creditor_id: new FormControl<number | null>(null),
    description: new FormControl('', [Validators.required]),
    amount: new FormControl(),
    irpf: new FormControl(),
    iva: new FormControl(),
    total_amount: new FormControl(0, [Validators.required, Validators.min(1)]),
    total_amount_irpf: new FormControl(),
    subsidy: new FormControl(''),
    subsidy_year: new FormControl<number | null>(null, [
      Validators.min(1995),
      Validators.max(new Date().getFullYear()),
    ]),
    invoice_file: new FormControl<string | File | null>(null), // 🔹 Acepta string, File o null
  });
  currentYear = this.generalService.currentYear;

  ngOnInit(): void {
    this.years = this.generalService.loadYears(this.currentYear, 2018);

    if (this.itemId) {
      this.invoicesFacade.loadInvoiceById(this.itemId);
      this.invoicesFacade.selectedInvoice$
        .pipe(
          filter(
            (invoice: InvoiceWithCreditorModel | null) => invoice !== null
          ),
          tap((invoice: InvoiceWithCreditorModel | null) => {
            if (invoice) {
              this.formInvoice.patchValue({
                number_invoice: invoice.number_invoice || '',
                type_invoice: invoice.type_invoice || '',
                date_invoice: invoice.date_invoice || '',
                date_accounting: invoice.date_accounting || '',
                date_payment: invoice.date_payment || '',
                creditor_id: invoice.creditor_id || null,
                description: invoice.description || '',
                amount: invoice.amount || null,
                irpf: invoice.irpf || null,
                iva: invoice.iva || null,
                total_amount: invoice.total_amount || null,
                total_amount_irpf: invoice.total_amount_irpf || null,
                subsidy: invoice.subsidy || '',
                subsidy_year: invoice.subsidy_year || null,
                invoice_file: invoice.invoice_file || '',
              });
              if (invoice.creditor_company) {
                let displayValue = invoice.creditor_company;

                // Agrega el contacto si es distinto del nombre de la compañía
                if (
                  invoice.creditor_contact &&
                  invoice.creditor_contact !== invoice.creditor_company
                ) {
                  displayValue += ' - ' + invoice.creditor_contact;
                }

                this.searchInput.setValue(displayValue);
              }
              this.titleForm = 'Editar Factura';
              this.buttonAction = 'Guardar cambios';
            }
          })
        )
        .subscribe();
    }
    this.formInvoice
      .get('type_invoice')
      ?.valueChanges.pipe(
        takeUntilDestroyed(this.destroyRef),
        tap((value) => {
          if (value !== null) {
            if (value === 'Ticket' || value === 'Ingreso') {
              this.formInvoice
                .get('subsidy')
                ?.setValue('', { emitEvent: false });
              this.formInvoice.get('subsidy')?.disable();
            } else {
              this.formInvoice.get('subsidy')?.enable();
            }
          }
        })
      )
      .subscribe();

    this.formInvoice
      .get('subsidy')
      ?.valueChanges.pipe(
        takeUntilDestroyed(this.destroyRef),
        tap((value) => {
          const subsidy_yearControl = this.formInvoice.get('subsidy_year');
          if (subsidy_yearControl) {
            if (value) {
              subsidy_yearControl.setValidators([Validators.required]);
              subsidy_yearControl.enable();
            } else {
              subsidy_yearControl.clearValidators();
              subsidy_yearControl.disable();
            }
            subsidy_yearControl.updateValueAndValidity();
            subsidy_yearControl.setValue(null);
          }
        })
      )
      .subscribe();
  }

  searchCreditor() {
    const value: string = this.searchInput.value?.trim() || '';

    if (!value) {
      this.formInvoice.get('creditor_id')?.setErrors(null);
      return;
    }

    this.creditorsService
      .getSuggestions(value)
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        tap((creditors) => {
          this.creditors = creditors;
          const isValid = creditors.some(
            (creditor) => creditor.company === value
          );

          if (!isValid) {
            this.formInvoice
              .get('creditor_id')
              ?.setErrors({ notRegistered: true });
          } else {
            this.formInvoice.get('creditor_id')?.setErrors(null);
          }
        })
      )
      .subscribe();
  }

  onSelectedOption(event: MatAutocompleteSelectedEvent): void {
    if (!event.option.value) {
      this.selectedCreditor = undefined;
      return;
    }
    const creditor: CreditorModel = event.option.value;
    let displayValue = creditor.company;
    if (creditor.contact && creditor.contact !== creditor.company) {
      displayValue += ' - ' + creditor.contact;
    }
    this.searchInput.setValue(displayValue);
    this.selectedCreditor = creditor;
  }

  creditorSelected(creditor: CreditorModel): void {
    this.formInvoice.patchValue({
      creditor_id: creditor.id,
    });
  }

  // Maneja el evento de ocultar sugerencias al perder el foco
  hideSuggestions(): void {
    setTimeout(() => {
      this.showSuggestions = false; // Permitir que el clic se registre
    }, 100);
  }

  getCreditorsById(id: number | null): Observable<CreditorAutocompleteModel> {
    if (id === null) {
      return throwError(() => new Error('ID del acreedor no puede ser null'));
    }
    return this.creditorsService.getCreditorById(id).pipe(
      map((creditor) => ({
        id: creditor.id,
        company: creditor.company,
        cif: creditor.cif,
      }))
    );
  }

  onPdfSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (input.files && input.files.length > 0) {
      const file = input.files[0];

      if (file.type === 'application/pdf') {
        this.formInvoice.patchValue({ invoice_file: file });
      } else {
        console.warn('⚠️ Formato incorrecto. Selecciona un archivo PDF.');
      }
    } else {
      console.warn('⚠️ No se seleccionó ningún archivo.');
    }
  }

  onSendFormInvoice(): void {
    if (this.formInvoice.invalid) {
      this.submitted = true;
      console.log('⚠️ Formulario inválido', this.formInvoice.errors);
      return;
    }
    // 🚨 Validación: Si el campo tiene texto pero no es un acreedor válido
    const enteredCreditor = this.searchInput.value;
    const isValidCreditor = this.creditors.some(
      (creditor) => creditor.company === enteredCreditor
    );

    if (enteredCreditor && !isValidCreditor) {
      this.formInvoice.get('creditor_id')?.setErrors({ notRegistered: true });
      return;
    }
    const formData = new FormData();

    formData.append(
      'number_invoice',
      this.formInvoice.value.number_invoice || ''
    );
    formData.append('type_invoice', this.formInvoice.value.type_invoice || '');
    formData.append('date_invoice', this.formInvoice.value.date_invoice || '');
    formData.append(
      'date_accounting',
      this.formInvoice.value.date_accounting || ''
    );
    formData.append('date_payment', this.formInvoice.value.date_payment || '');
    formData.append('description', this.formInvoice.value.description || '');
    formData.append('amount', this.formInvoice.value.amount?.toString() || '');
    formData.append('irpf', this.formInvoice.value.irpf?.toString() || '');
    formData.append('iva', this.formInvoice.value.iva?.toString() || '');
    formData.append(
      'total_amount',
      this.formInvoice.value.total_amount?.toString() || ''
    );
    formData.append(
      'total_amount_irpf',
      this.formInvoice.value.total_amount_irpf?.toString() || ''
    );
    formData.append('subsidy', this.formInvoice.value.subsidy || '');
    formData.append(
      'subsidy_year',
      this.formInvoice.value.subsidy_year
        ? this.formInvoice.value.subsidy_year.toString()
        : ''
    );

    // Si `creditor_id` existe
    if (this.formInvoice.value.creditor_id) {
      formData.append(
        'creditor_id',
        this.formInvoice.value.creditor_id.toString()
      );
    }

    // 🔹 Añadir archivo o URL existente
    const urlValue = this.formInvoice.value.invoice_file;
    if (urlValue instanceof File) {
      formData.append('invoice_file', urlValue);
    } else if (typeof urlValue === 'string') {
      formData.append('existingUrl', urlValue);
    }

    // 🔹 Si es edición, añadir método y ID
    if (this.itemId) {
      formData.append('_method', 'PATCH');
      formData.append('id', this.itemId.toString());
    }

    console.log(
      '📤 Enviando FormData:',
      Object.fromEntries((formData as any).entries())
    );

    this.sendFormInvoice.emit({
      itemId: this.itemId,
      newInvoiceData: formData,
    });
  }
}
