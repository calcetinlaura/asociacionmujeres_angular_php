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
import { filter, map, Observable, tap, throwError } from 'rxjs';
import { InvoicesFacade } from 'src/app/application';
import { filterSubsidies } from 'src/app/core/models/general.model';
import { InvoicesService } from 'src/app/core/services/invoices.services';
import { CreditorsService } from 'src/app/core/services/creditors.services';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import {
  MatAutocompleteModule,
  MatAutocompleteSelectedEvent,
} from '@angular/material/autocomplete';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { InvoiceModel } from 'src/app/core/interfaces/invoice.interface';
import {
  CreditorAutocompleteModel,
  CreditorModel,
} from 'src/app/core/interfaces/creditor.interface';
import { EditorModule } from '@tinymce/tinymce-angular';
import { MatCardModule } from '@angular/material/card';
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
  providers: [InvoicesService],
})
export class FormInvoiceComponent {
  private destroyRef = inject(DestroyRef);
  private invoicesFacade = inject(InvoicesFacade);
  private generalService = inject(GeneralService);

  @Input() itemId!: number;
  @Output() sendFormInvoice = new EventEmitter<InvoiceModel>();
  invoiceData: any;
  imageSrc: string = '';
  errorSession: boolean = false;
  submitted: boolean = false;
  titleForm: string = 'Registrar factura';
  buttonAction: string = 'Guardar';
  years: number[] = [];
  FilterSubsidies = filterSubsidies;
  creditors: CreditorModel[] = [];
  selectedCreditor?: CreditorAutocompleteModel;
  filteredCreditors: CreditorModel[] = [];
  searchControl = new FormControl();
  showSuggestions: boolean = false;
  searchInput = new FormControl();

  formInvoice = new FormGroup({
    numberInvoice: new FormControl(''),
    typeInvoice: new FormControl('', [Validators.required]),
    dateInvoice: new FormControl<string | null>(null, [Validators.required]), // String para el input de tipo date
    dateAccounting: new FormControl<string | null>(null),
    datePayment: new FormControl<string | null>(null),
    creditorId: new FormControl<number | null>(null),
    description: new FormControl('', [Validators.required]),
    amount: new FormControl(),
    irpf: new FormControl(),
    iva: new FormControl(),
    totalAmount: new FormControl(0, [Validators.required, Validators.min(1)]),
    totalAmountIrpf: new FormControl(),
    subsidy: new FormControl(''),
    subsidyYear: new FormControl(),
  });

  constructor(private creditorsService: CreditorsService) {}

  ngOnInit(): void {
    const currentYear = this.generalService.currentYear;
    this.years = this.generalService.loadYears(currentYear, 2018);

    if (this.itemId) {
      this.invoicesFacade.loadInvoiceById(this.itemId);
      this.invoicesFacade.selectedInvoice$
        .pipe(
          filter((invoice: InvoiceModel | null) => invoice !== null),
          tap((invoice: InvoiceModel | null) => {
            if (invoice) {
              this.formInvoice.patchValue({
                numberInvoice: invoice.numberInvoice || '',
                typeInvoice: invoice.typeInvoice || '',
                dateInvoice: invoice.dateInvoice || null,
                dateAccounting: invoice.dateAccounting || null,
                datePayment: invoice.datePayment || null,
                creditorId: invoice.creditorId || null,
                description: invoice.description || '',
                amount: invoice.amount || null,
                irpf: invoice.irpf || null,
                iva: invoice.iva || null,
                totalAmount: invoice.totalAmount || null,
                totalAmountIrpf: invoice.totalAmountIrpf || null,
                subsidy: invoice.subsidy || '',
                subsidyYear: invoice.subsidyYear || null,
              });
              if (invoice.creditorId) {
                this.getCreditorsById(invoice.creditorId)
                  .pipe(
                    takeUntilDestroyed(this.destroyRef),
                    tap((creditor) => {
                      this.selectedCreditor = creditor;
                      this.searchInput.setValue(creditor.company); // Actualiza el campo de búsqueda
                    })
                  )
                  .subscribe();
              }
              this.titleForm = 'Editar Factura';
              this.buttonAction = 'Guardar cambios';
            }
          })
        )
        .subscribe();
    }
    this.formInvoice
      .get('typeInvoice')
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
          const subsidyYearControl = this.formInvoice.get('subsidyYear');
          if (subsidyYearControl) {
            if (value) {
              subsidyYearControl.setValidators([Validators.required]);
              subsidyYearControl.enable();
            } else {
              subsidyYearControl.clearValidators();
              subsidyYearControl.disable();
            }
            subsidyYearControl.updateValueAndValidity();
            subsidyYearControl.setValue(null);
          }
        })
      )
      .subscribe();
  }

  searchCreditor() {
    const value: string = this.searchInput.value || '';
    this.creditorsService
      .getSuggestions(value)
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        tap((creditors) => (this.creditors = creditors))
      )
      .subscribe();
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

  creditorSelected(creditor: CreditorModel): void {
    this.formInvoice.patchValue({
      creditorId: creditor.id,
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

  onSendFormInvoice(): void {
    if (this.formInvoice.invalid) {
      this.submitted = true; // Marcar como enviado
      return;
    }

    const formValue: InvoiceModel = {
      numberInvoice: this.formInvoice.get('numberInvoice')?.value || '',
      typeInvoice: this.formInvoice.get('typeInvoice')?.value || '',
      dateInvoice: this.formInvoice.get('dateInvoice')?.value || '',
      dateAccounting: this.formInvoice.get('dateAccounting')?.value || '',
      datePayment: this.formInvoice.get('datePayment')?.value || '',
      creditorId: this.formInvoice.get('creditorId')?.value || null,
      description: this.formInvoice.get('description')?.value || '',
      amount: this.formInvoice.get('amount')?.value || null,
      irpf: this.formInvoice.get('irpf')?.value || null,
      iva: this.formInvoice.get('iva')?.value || null,
      totalAmount: this.formInvoice.get('totalAmount')?.value || 0,
      totalAmountIrpf: this.formInvoice.get('totalAmountIrpf')?.value || null,
      subsidy: this.formInvoice.get('subsidy')?.value || '',
      subsidyYear: this.formInvoice.get('subsidyYear')?.value || null,
    };
    this.sendFormInvoice.emit(formValue);
  }
}
