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
import {
  combineLatest,
  filter,
  forkJoin,
  map,
  Observable,
  startWith,
  tap,
} from 'rxjs';
import { CreditorsFacade } from 'src/app/application/creditors.facade';
import { InvoicesFacade } from 'src/app/application/invoices.facade';
import { ProjectsFacade } from 'src/app/application/projects.facade';
import { SubsidiesFacade } from 'src/app/application/subsidies.facade';
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
import { GeneralService } from 'src/app/core/services/generalService.service';
import { ButtonSelectComponent } from 'src/app/shared/components/buttons/button-select/button-select.component';
import { PdfControlComponent } from 'src/app/shared/components/pdf-control/pdf-control.component';
import { SpinnerLoadingComponent } from 'src/app/shared/components/spinner-loading/spinner-loading.component';
import { ScrollToFirstErrorDirective } from 'src/app/shared/directives/scroll-to-first-error.directive';
import { sortByCompany } from 'src/app/shared/utils/facade.utils';
import { dateBetween } from 'src/app/shared/utils/validators.utils';

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
export class FormInvoiceComponent implements OnInit {
  private readonly destroyRef = inject(DestroyRef);
  readonly invoicesFacade = inject(InvoicesFacade);
  readonly creditorsFacade = inject(CreditorsFacade);
  private readonly projectsFacade = inject(ProjectsFacade);
  private readonly subsidiesFacade = inject(SubsidiesFacade);
  private readonly generalService = inject(GeneralService);

  readonly minDate = new Date(2018, 0, 1);
  readonly tomorrowDate = (() => {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    d.setDate(d.getDate() + 1);
    return d;
  })();
  readonly creditorsSorted$ = this.creditorsFacade.filteredCreditors$.pipe(
    map((arr) => sortByCompany(arr))
  );
  @Input() itemId!: number;
  @Input() item: InvoiceModelFullData | null = null;

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
    this.initYears();
    this.initInvoiceData();
    this.initCreditors();
    this.handleDateAndTypeChanges();
    this.handleAmountChanges();
  }
  // ────────────────────────────────────────────────────────────────
  // Inicialización general
  // ────────────────────────────────────────────────────────────────
  private initYears(): void {
    this.years = this.generalService.loadYears(this.currentYear, 2018);
  }

  // ────────────────────────────────────────────────────────────────
  // Inicializa factura (item o itemId)
  // ────────────────────────────────────────────────────────────────
  private initInvoiceData(): void {
    if (this.item) {
      this.populateFormWithItem(this.item);
      return;
    }

    if (this.itemId) {
      this.invoicesFacade.loadInvoiceById(this.itemId);
      this.invoicesFacade.selectedInvoice$
        .pipe(
          takeUntilDestroyed(this.destroyRef),
          filter((invoice): invoice is InvoiceModelFullData => !!invoice),
          tap((invoice) => this.populateFormWithItem(invoice))
        )
        .subscribe();
    }
  }

  // ────────────────────────────────────────────────────────────────
  // Acreedores (carga + sincronización reactiva)
  // ────────────────────────────────────────────────────────────────
  private initCreditors(): void {
    this.creditorsFacade.loadAllCreditors();

    this.creditorsFacade.filteredCreditors$
      .pipe(
        map((arr) => sortByCompany(arr)), // ✅ orden alfabético
        takeUntilDestroyed(this.destroyRef),
        tap((creditors) =>
          console.log('🧾 Acreedores cargados (ordenados):', creditors)
        )
      )
      .subscribe((creditors) => (this.filteredCreditors = creditors ?? []));
  }

  // ────────────────────────────────────────────────────────────────
  // Gestión de fechas y activación de inputs dependientes
  // ────────────────────────────────────────────────────────────────
  private handleDateAndTypeChanges(): void {
    // Activar `project_id` según la fecha
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

    // Activar `subsidy_id` solo si es factura
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
  }

  // ────────────────────────────────────────────────────────────────
  // Cálculo reactivo de totales (amount + iva + irpf)
  // ────────────────────────────────────────────────────────────────
  private handleAmountChanges(): void {
    combineLatest([
      this.formInvoice
        .get('amount')!
        .valueChanges.pipe(
          startWith(this.formInvoice.get('amount')!.value || 0)
        ),
      this.formInvoice
        .get('iva')!
        .valueChanges.pipe(startWith(this.formInvoice.get('iva')!.value || 0)),
      this.formInvoice
        .get('irpf')!
        .valueChanges.pipe(startWith(this.formInvoice.get('irpf')!.value || 0)),
    ])
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        tap(([amount, iva, irpf]) => {
          const parsedAmount = Number(amount) || 0;
          const parsedIva = Number(iva) || 0;
          const parsedIrpf = Number(irpf) || 0;
          const total = parsedAmount + parsedIva - parsedIrpf;
          const totalIrpf = parsedAmount + parsedIva;

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

  // ────────────────────────────────────────────────────────────────
  // Métodos auxiliares
  // ────────────────────────────────────────────────────────────────
  private populateFormWithItem(invoice: InvoiceModelFullData): void {
    this.formInvoice.reset();
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

    switch (invoice.type_invoice) {
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

    if (invoice.subsidy_id) this.invoiceTypeSubsidy = 'SUBSIDY';
    if (invoice.project_id) this.invoiceTypeProject = 'PROJECT';

    if (invoice.creditor_id) {
      this.creditorsFacade.loadCreditorById(invoice.creditor_id);
      this.creditorsFacade.selectedCreditor$
        .pipe(
          takeUntilDestroyed(this.destroyRef),
          filter((creditor): creditor is any => !!creditor),
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

  // ────────────────────────────────────────────────────────────────
  // Validaciones
  // ────────────────────────────────────────────────────────────────
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

  private loadSubsidiesByYear(
    year: number
  ): Observable<SubsidyModelFullData[]> {
    // Dispara la carga en la facade
    this.subsidiesFacade.loadSubsidiesByYear(year);

    // Nos suscribimos una sola vez a la lista filtrada (ya ordenada si lo haces en facade)
    return this.subsidiesFacade.filteredSubsidies$.pipe(
      filter((subs): subs is SubsidyModelFullData[] => Array.isArray(subs)),
      tap((subs) => (this.subsidies = subs)),
      takeUntilDestroyed(this.destroyRef)
    );
  }

  private loadProjectsByYear(year: number): Observable<void> {
    this.projectsFacade.loadProjectsByYear(year);

    // Nos suscribimos una sola vez a la lista de proyectos cargados
    return this.projectsFacade.filteredProjects$.pipe(
      filter((projects): projects is ProjectModel[] => Array.isArray(projects)),
      tap((projects) => {
        this.projects = projects;
      }),
      takeUntilDestroyed(this.destroyRef),
      map(() => void 0)
    );
  }

  // ────────────────────────────────────────────────────────────────
  // Tipo de movimiento, proyecto, subvención
  // ────────────────────────────────────────────────────────────────
  setInvoiceTypeMovement(
    type: 'INVOICE' | 'TICKET' | 'INCOME' | 'UNSPECIFIED'
  ): void {
    this.invoiceTypeMovement = type;
    this.formInvoice.patchValue({
      type_invoice: type === 'UNSPECIFIED' ? '' : type,
    });
  }

  setInvoiceTypeSubsidy(type: 'NO_SUBSIDY' | 'SUBSIDY'): void {
    this.invoiceTypeSubsidy = type;
    this.formInvoice.patchValue({ subsidy_id: null });
  }

  setInvoiceTypeProject(type: 'NO_PROJECT' | 'PROJECT'): void {
    this.invoiceTypeProject = type;
    this.formInvoice.patchValue({ project_id: null });
  }

  // ────────────────────────────────────────────────────────────────
  // Acreedores (búsqueda)
  // ────────────────────────────────────────────────────────────────
  searchCreditor(): void {
    const value: string = this.searchInput.value?.trim() || '';
    const creditorControl = this.formInvoice.get('creditor_id');

    if (!value) {
      creditorControl?.reset(null);
      creditorControl?.setErrors(null);
      this.creditorsFacade.setKeyword('');
      return;
    }

    // Actualiza la palabra clave en la facade
    this.creditorsFacade.setKeyword(value);

    // Busca coincidencias en los acreedores filtrados
    this.creditorsFacade.filteredCreditors$
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        tap((creditors) => {
          const matchedCreditor = creditors.find(
            (c) =>
              c.company.toLowerCase() === value.toLowerCase() ||
              value.toLowerCase().includes(c.company.toLowerCase())
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
    this.formInvoice.patchValue({ creditor_id: creditor.id });
  }

  hideSuggestions(): void {
    setTimeout(() => {
      this.showSuggestions = false;
    }, 100);
  }

  // ────────────────────────────────────────────────────────────────
  // PDF y envío del formulario
  // ────────────────────────────────────────────────────────────────
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

    if (this.formInvoice.invalid) {
      console.warn('⚠️ Formulario inválido', this.formInvoice.errors);
      return;
    }

    const rawValues = { ...this.formInvoice.getRawValue() } as any;

    const defaultValues: { [key: string]: any } = {
      irpf: null,
      iva: null,
      invoice_pdf: '',
      proof_pdf: '',
    };

    for (const key in rawValues) {
      if (rawValues[key] === null || rawValues[key] === undefined) {
        if (key in defaultValues) {
          rawValues[key] = defaultValues[key];
        } else {
          rawValues[key] = '';
        }
      }
    }

    if (rawValues.description) {
      rawValues.description = rawValues.description.replace(/&nbsp;/g, ' ');
    }

    const pdfInvoice = rawValues.invoice_pdf;
    const pdfProof = rawValues.proof_pdf;

    let fileInvoice: File | null = null;
    let fileProof: File | null = null;

    if (pdfInvoice instanceof File) {
      fileInvoice = pdfInvoice;
    } else if (typeof pdfInvoice === 'string' && pdfInvoice.trim() !== '') {
      rawValues.invoice_pdf_existing = pdfInvoice;
    } else {
      rawValues.invoice_pdf_existing = '';
    }

    if (pdfProof instanceof File) {
      fileProof = pdfProof;
    } else if (typeof pdfProof === 'string' && pdfProof.trim() !== '') {
      rawValues.proof_pdf_existing = pdfProof;
    } else {
      rawValues.proof_pdf_existing = '';
    }

    delete rawValues.invoice_pdf;
    delete rawValues.proof_pdf;

    const formData = this.generalService.createFormData(
      rawValues,
      {
        invoice_pdf: fileInvoice,
        proof_pdf: fileProof,
      },
      this.itemId
    );

    this.submitForm.emit({
      itemId: this.itemId,
      formData,
    });
  }

  conceptLen(): number {
    return (this.formInvoice.get('concept')?.value || '').length;
  }

  descriptionLen(): number {
    return (this.formInvoice.get('description')?.value || '').length;
  }
}
