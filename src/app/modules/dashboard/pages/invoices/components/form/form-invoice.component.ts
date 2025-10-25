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

import { QuillModule } from 'ngx-quill';
import {
  combineLatest,
  filter,
  forkJoin,
  map,
  Observable,
  startWith,
  tap,
  throwError,
} from 'rxjs';
import { InvoicesFacade } from 'src/app/application/invoices.facade';
import {
  CreditorAutocompleteModel,
  CreditorModel,
} from 'src/app/core/interfaces/creditor.interface';
import { InvoiceModelFullData } from 'src/app/core/interfaces/invoice.interface';
import { ProjectModel } from 'src/app/core/interfaces/project.interface';
import {
  categoryFilterSubsidies,
  SubsidyModelFullData,
} from 'src/app/core/interfaces/subsidy.interface';
import { TypeList } from 'src/app/core/models/general.model';
import { CreditorsService } from 'src/app/core/services/creditors.services';
import { ProjectsService } from 'src/app/core/services/projects.services';
import { SubsidiesService } from 'src/app/core/services/subsidies.services';
import { ButtonSelectComponent } from 'src/app/shared/components/buttons/button-select/button-select.component';
import { PdfControlComponent } from 'src/app/shared/components/pdf-control/pdf-control.component';
import { SpinnerLoadingComponent } from 'src/app/shared/components/spinner-loading/spinner-loading.component';
import { ScrollToFirstErrorDirective } from 'src/app/shared/directives/scroll-to-first-error.directive';
import { GeneralService } from 'src/app/shared/services/generalService.service';
import { dateBetween } from 'src/app/shared/utils/validators.utils';

@Component({
  selector: 'app-form-invoice',
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatCheckboxModule,
    MatRadioModule,
    MatAutocompleteModule,
    MatFormFieldModule,
    MatInputModule,
    MatCardModule,
    PdfControlComponent,
    QuillModule,
    SpinnerLoadingComponent,
    ButtonSelectComponent,
    ScrollToFirstErrorDirective,
  ],
  templateUrl: './form-invoice.component.html',
  styleUrls: ['./../../../../../../shared/components/form/form.component.css'],
})
export class FormInvoiceComponent {
  private destroyRef = inject(DestroyRef);
  private invoicesFacade = inject(InvoicesFacade);
  private generalService = inject(GeneralService);
  private creditorsService = inject(CreditorsService);
  private subsidiesService = inject(SubsidiesService);
  private projectsService = inject(ProjectsService);
  readonly minDate = new Date(2018, 0, 1); // > 2018 ⇒ desde 2019-01-01
  readonly tomorrowDate = (() => {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    d.setDate(d.getDate() + 1);
    return d;
  })();

  @Input() itemId!: number;
  @Output() submitForm = new EventEmitter<{
    itemId: number;
    formData: FormData;
  }>();
  invoiceTypeMovement: 'INVOICE' | 'TICKET' | 'INCOME' | 'UNSPECIFIED' =
    'UNSPECIFIED';
  invoiceTypeSubsidy: 'NO_SUBSIDY' | 'SUBSIDY' = 'NO_SUBSIDY';
  invoiceTypeProject: 'NO_PROJECT' | 'PROJECT' = 'NO_PROJECT';
  invoiceData: any;
  imageSrc: string = '';
  submitted: boolean = false;
  titleForm: string = 'Registrar movimiento';
  buttonAction: string = 'Guardar';
  years: number[] = [];
  FilterSubsidies = categoryFilterSubsidies;
  creditors: CreditorModel[] = [];
  selectedCreditor?: CreditorAutocompleteModel;
  filteredCreditors: CreditorModel[] = [];
  searchControl = new FormControl();
  showSuggestions: boolean = false;
  searchInput = new FormControl();
  typeList = TypeList.Invoices;
  previewPdfValue: string | File | null = null;
  selectedPdfValue: string | File | null = null;
  selectedProofPdfValue: string | File | null = null;

  formInvoice = new FormGroup({
    number_invoice: new FormControl(''),
    type_invoice: new FormControl('', [
      Validators.pattern(/^(INVOICE|TICKET|INCOME)$/),
    ]),
    date_invoice: new FormControl('', [
      Validators.required,
      dateBetween(this.minDate, this.tomorrowDate),
    ]),
    date_accounting: new FormControl(''),
    date_payment: new FormControl(''),
    creditor_id: new FormControl<number | null>(null),
    description: new FormControl('', [Validators.maxLength(500)]),
    concept: new FormControl('', [
      Validators.required,
      Validators.maxLength(100),
    ]),
    amount: new FormControl<number | null>(null, [
      Validators.required,
      Validators.min(1),
      Validators.pattern(/^[0-9]+(\.[0-9]{1,2})?$/),
    ]),
    irpf: new FormControl<number | null>(null),
    iva: new FormControl<number | null>(null),
    total_amount: new FormControl<number | null>({
      value: null,
      disabled: true,
    }),
    total_amount_irpf: new FormControl<number | null>({
      value: null,
      disabled: true,
    }),
    subsidy_id: new FormControl<number | null>({
      value: null,
      disabled: true,
    }),
    project_id: new FormControl<number | null>({
      value: null,
      disabled: true,
    }),
    invoice_pdf: new FormControl<string | File | null>(null),
    proof_pdf: new FormControl<string | File | null>(null),
  });
  subsidies: SubsidyModelFullData[] = [];
  projects: ProjectModel[] = [];
  currentYear = this.generalService.currentYear;
  private loadedYearData: number | null = null;
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
      this.invoicesFacade.loadInvoiceById(this.itemId);
      this.invoicesFacade.selectedInvoice$
        .pipe(
          takeUntilDestroyed(this.destroyRef),
          filter((invoice: InvoiceModelFullData | null) => invoice !== null),
          tap((invoice: InvoiceModelFullData | null) => {
            if (invoice) {
              this.formInvoice.reset(); // <-- limpia el formulario completo
              this.creditors = [];
              this.selectedCreditor = undefined;
              this.searchInput.reset('');
              this.formInvoice.patchValue({
                number_invoice: invoice.number_invoice || '',
                type_invoice: invoice.type_invoice || '',
                date_invoice: invoice.date_invoice || '',
                date_accounting: invoice.date_accounting || '',
                date_payment: invoice.date_payment || '',
                creditor_id: invoice.creditor_id,
                description: invoice.description || '',
                concept: invoice.concept || '',
                amount: invoice.amount || null,
                irpf: invoice.irpf || null,
                iva: invoice.iva || null,
                total_amount: invoice.total_amount || null,
                total_amount_irpf: invoice.total_amount_irpf || null,
                subsidy_id: invoice.subsidy_id,
                project_id: invoice.project_id,
                invoice_pdf: invoice.invoice_pdf || '',
                proof_pdf: invoice.proof_pdf || '',
              });

              if (invoice.creditor_company) {
                let displayValue = invoice.creditor_company;

                if (
                  invoice.creditor_contact &&
                  invoice.creditor_contact !== invoice.creditor_company
                ) {
                  displayValue += ' - ' + invoice.creditor_contact;
                }

                this.searchInput.setValue(displayValue);
              }
              switch (
                invoice.type_invoice as
                  | 'INVOICE'
                  | 'TICKET'
                  | 'INCOME'
                  | 'UNSPECIFIED'
              ) {
                case 'INVOICE':
                  this.setInvoiceTypeMovement('INVOICE');
                  break;

                case 'TICKET':
                  this.setInvoiceTypeMovement('TICKET');
                  break;
                case 'INCOME':
                  this.setInvoiceTypeMovement('INCOME');
                  break;
                default:
                  this.setInvoiceTypeMovement('UNSPECIFIED');
                  break;
              }
              if (invoice.subsidy_id) {
                this.invoiceTypeSubsidy = 'SUBSIDY';
              }
              if (invoice.project_id) {
                this.invoiceTypeProject = 'PROJECT';
              }
              // ✅ Solución: cargar el acreedor por ID si existe
              if (invoice.creditor_id) {
                this.getCreditorsById(invoice.creditor_id)
                  .pipe(
                    takeUntilDestroyed(this.destroyRef),
                    tap((creditor) => {
                      this.creditors = [creditor];
                      this.formInvoice.patchValue({ creditor_id: creditor.id });
                    })
                  )
                  .subscribe();
              }
              this.selectedPdfValue = invoice.invoice_pdf || '';
              this.selectedProofPdfValue = invoice.proof_pdf || '';
              this.titleForm = 'Editar Factura';
              this.buttonAction = 'Guardar cambios';
            }
            this.isLoading = false;
          })
        )
        .subscribe();
    } else {
      this.isLoading = false;
    }

    // Activar `project_id` solo con date_invoice válido
    this.formInvoice
      .get('date_invoice')!
      .valueChanges.pipe(
        startWith(this.formInvoice.get('date_invoice')!.value),
        takeUntilDestroyed(this.destroyRef),
        tap((date_invoice: string | null) => {
          if (date_invoice) {
            const year = this.generalService.getYearFromDate(date_invoice);
            this.loadYearlyData(year).subscribe();
            this.generalService.enableInputControls(this.formInvoice, [
              'project_id',
            ]);
          } else {
            this.generalService.disableInputControls(this.formInvoice, [
              'project_id',
            ]);
          }
        })
      )
      .subscribe();

    // Activar `subsidy_id` solo si date_invoice es válido Y type_invoice es 'Factura'
    combineLatest([
      this.formInvoice
        .get('date_invoice')!
        .valueChanges.pipe(
          startWith(this.formInvoice.get('date_invoice')!.value)
        ),
      this.formInvoice
        .get('type_invoice')!
        .valueChanges.pipe(
          startWith(this.formInvoice.get('type_invoice')!.value)
        ),
    ])
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        tap(([date_invoice, type_invoice]) => {
          if (date_invoice && type_invoice === 'INVOICE') {
            this.generalService.enableInputControls(this.formInvoice, [
              'subsidy_id',
            ]);
          } else {
            this.generalService.disableInputControls(this.formInvoice, [
              'subsidy_id',
            ]);
            this.formInvoice.get('subsidy_id')?.setValue(null);
          }
        })
      )
      .subscribe();

    combineLatest([
      this.formInvoice
        .get('amount')!
        .valueChanges.pipe(
          startWith(this.formInvoice.get('amount')!.value || null)
        ),
      this.formInvoice
        .get('iva')!
        .valueChanges.pipe(
          startWith(this.formInvoice.get('iva')!.value || null)
        ),
      this.formInvoice
        .get('irpf')!
        .valueChanges.pipe(
          startWith(this.formInvoice.get('irpf')!.value || null)
        ),
    ])
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        tap(([amount, iva, irpf]) => {
          // Convertir los valores a números
          const parsedAmount = Number(amount) || 0;
          const parsedIva = Number(iva) || 0;
          const parsedIrpf = Number(irpf) || 0;

          // Calcular el total_amount
          const total = parsedAmount + parsedIva - parsedIrpf;
          const totalIrpf = parsedAmount + parsedIva;

          // Asignar el valor al campo total_amount
          this.formInvoice
            .get('total_amount')
            ?.setValue(total, { emitEvent: false });
          this.formInvoice
            .get('total_amount_irpf')
            ?.setValue(totalIrpf, { emitEvent: false });
        })
      )
      .subscribe();
  }
  hasErrorsIn(fields: string[]): boolean {
    return fields.some((field) => this.formInvoice.get(field)?.invalid);
  }

  hasErrorMovementType(): boolean {
    return this.submitted && !this.isInvoiceTypeMovementSelected;
  }

  get isInvoiceTypeMovementSelected(): boolean {
    return (
      this.invoiceTypeMovement === 'INVOICE' ||
      this.invoiceTypeMovement === 'TICKET' ||
      this.invoiceTypeMovement === 'INCOME'
    );
  }
  private loadYearlyData(year: number): Observable<void> {
    if (this.loadedYearData === year) {
      return new Observable<void>((obs) => obs.complete());
    }

    this.loadedYearData = year;

    return forkJoin([
      this.loadProjectsByYear(year),
      this.loadSubsidiesByYear(year),
    ]).pipe(map(() => void 0));
  }

  loadSubsidiesByYear(year: number): Observable<SubsidyModelFullData[]> {
    return this.subsidiesService.getSubsidiesByYear(year).pipe(
      tap((subsidies) => {
        this.subsidies = subsidies;
      })
    );
  }

  loadProjectsByYear(year: number): Observable<ProjectModel[]> {
    return this.projectsService.getProjectsByYear(year).pipe(
      tap((projects) => {
        this.projects = projects;
      })
    );
  }
  setInvoiceTypeMovement(
    type: 'INVOICE' | 'TICKET' | 'INCOME' | 'UNSPECIFIED'
  ): void {
    this.invoiceTypeMovement = type;
    if (type === 'INVOICE') {
      this.formInvoice.patchValue({ type_invoice: 'INVOICE' });
    }
    if (type === 'TICKET') {
      this.formInvoice.patchValue({ type_invoice: 'TICKET' });
    }
    if (type === 'INCOME') {
      this.formInvoice.patchValue({ type_invoice: 'INCOME' });
    }
    if (type === 'UNSPECIFIED') {
      this.formInvoice.patchValue({ type_invoice: '' });
    }
  }
  setInvoiceTypeSubsidy(type: 'NO_SUBSIDY' | 'SUBSIDY'): void {
    this.invoiceTypeSubsidy = type;
    this.formInvoice.patchValue({ subsidy_id: null });
  }
  setInvoiceTypeProject(type: 'NO_PROJECT' | 'PROJECT'): void {
    this.invoiceTypeProject = type;
    this.formInvoice.patchValue({ project_id: null });
  }
  searchCreditor(): void {
    const value: string = this.searchInput.value?.trim() || '';
    const creditorControl = this.formInvoice.get('creditor_id');

    if (!value) {
      // Si el input está vacío, limpiar todo
      creditorControl?.reset(null); // Limpia el ID
      this.creditors = []; // Limpia sugerencias
      creditorControl?.setErrors(null); // Limpia errores manualmente
      return;
    }

    this.creditorsService
      .getSuggestions(value)
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        tap((creditors) => {
          // Filtrar y ordenar los resultados
          this.creditors = creditors
            .filter((creditor) =>
              creditor.company.toLowerCase().startsWith(value.toLowerCase())
            )
            .concat(
              creditors.filter(
                (creditor) =>
                  !creditor.company
                    .toLowerCase()
                    .startsWith(value.toLowerCase())
              )
            );

          const matchedCreditor = this.creditors.find(
            (creditor) =>
              creditor.company === value || value.includes(creditor.company)
          );

          if (matchedCreditor) {
            creditorControl?.setValue(matchedCreditor.id);
            creditorControl?.setErrors(null);
          } else {
            creditorControl?.setValue(null);
            creditorControl?.setErrors({ notRegistered: true });
          }
        })
      )
      .subscribe();
  }

  onSelectedOption(event: MatAutocompleteSelectedEvent): void {
    const creditor: CreditorModel = event.option.value;

    if (!creditor) {
      this.selectedCreditor = undefined;
      return;
    }

    let displayValue = creditor.company;
    if (creditor.contact && creditor.contact !== creditor.company) {
      displayValue += ' - ' + creditor.contact;
    }

    this.searchInput.setValue(displayValue);
    this.selectedCreditor = creditor;

    this.creditorSelected(creditor);
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

  onPdfSelected(event: File | null): void {
    this.formInvoice.patchValue({ invoice_pdf: event });
    this.selectedPdfValue = event;
  }

  onProofPdfSelected(event: File | null): void {
    this.formInvoice.patchValue({ proof_pdf: event });
    this.selectedProofPdfValue = event;
  }

  getInvoicePdfPreview(): string | null {
    const val = this.formInvoice.get('invoice_pdf')?.value;
    return typeof val === 'string' ? val : null;
  }

  onSendFormInvoice(): void {
    this.submitted = true;

    // Verificar si el formulario es válido antes de proceder
    if (this.formInvoice.invalid) {
      console.warn('⚠️ Formulario inválido', this.formInvoice.errors);
      return;
    }

    const rawValues = { ...this.formInvoice.getRawValue() } as any;
    console.log('Valores del formulario (rawValues):', rawValues);

    // Default values que pueden ser asignados si los campos son nulos
    const defaultValues: { [key: string]: any } = {
      irpf: null,
      iva: null,
      invoice_pdf: '',
      proof_pdf: '', // Asegúrate de asignar un valor predeterminado a 'invoice_pdf'
    };

    // Asegurarse de que los valores nulos sean reemplazados por un valor predeterminado
    for (const key in rawValues) {
      if (rawValues[key] === null || rawValues[key] === undefined) {
        if (key in defaultValues) {
          rawValues[key] = defaultValues[key];
          console.warn(
            `⚠️ El valor de ${key} es nulo o indefinido, asignando valor predeterminado`
          );
        } else {
          rawValues[key] = ''; // O el valor predeterminado que prefieras
        }
      }
    }

    // Limpiar descripción de espacios no rompibles
    if (rawValues.description) {
      rawValues.description = rawValues.description.replace(/&nbsp;/g, ' ');
    }
    console.log('Valores después de correcciones:', rawValues);

    // Manejo del PDF
    const pdfInvoice = rawValues.invoice_pdf;
    const pdfProof = rawValues.proof_pdf;

    let fileInvoice: File | null = null;
    let fileProof: File | null = null;

    // Factura
    if (pdfInvoice instanceof File) {
      fileInvoice = pdfInvoice;
    } else if (typeof pdfInvoice === 'string' && pdfInvoice.trim() !== '') {
      rawValues.invoice_pdf_existing = pdfInvoice; // URL existente
    } else {
      rawValues.invoice_pdf_existing = '';
    }

    // Justificante
    if (pdfProof instanceof File) {
      fileProof = pdfProof;
    } else if (typeof pdfProof === 'string' && pdfProof.trim() !== '') {
      rawValues.proof_pdf_existing = pdfProof; // URL existente
    } else {
      rawValues.proof_pdf_existing = '';
    }

    // Eliminamos los campos file del objeto plano antes de empaquetar
    delete rawValues.invoice_pdf;
    delete rawValues.proof_pdf;

    // Crear FormData usando el método createFormData de generalService
    const formData = this.generalService.createFormData(
      rawValues,
      {
        invoice_pdf: fileInvoice, // puede ser null
        proof_pdf: fileProof, // puede ser null
      }, // Se añade el archivo PDF (o la URL si es una cadena)
      this.itemId // itemId: El id de la factura, ya sea para edición o nueva
    );

    // Emitir el formulario con formData
    this.submitForm.emit({
      itemId: this.itemId,
      formData: formData,
    });
  }

  conceptLen(): number {
    return (this.formInvoice.get('concept')?.value || '').length;
  }
  descriptionLen(): number {
    return (this.formInvoice.get('description')?.value || '').length;
  }
}
