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
import { filter, forkJoin, map, Observable, tap, throwError } from 'rxjs';
import { InvoicesFacade } from 'src/app/application/invoices.facade';
import {
  CreditorAutocompleteModel,
  CreditorModel,
} from 'src/app/core/interfaces/creditor.interface';
import { InvoiceModelFullData } from 'src/app/core/interfaces/invoice.interface';
import { ProjectModel } from 'src/app/core/interfaces/project.interface';
import {
  categoryFilterSubsidies,
  SubsidyModel,
} from 'src/app/core/interfaces/subsidy.interface';
import { CreditorsService } from 'src/app/core/services/creditors.services';
import { ProjectsService } from 'src/app/core/services/projects.services';
import { SubsidiesService } from 'src/app/core/services/subsidies.services';
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
  private subsidiesService = inject(SubsidiesService);
  private projectsService = inject(ProjectsService);

  @Input() itemId!: number;
  @Output() sendFormInvoice = new EventEmitter<{
    itemId: number;
    formData: FormData;
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
    description: new FormControl('', [Validators.maxLength(2000)]),
    amount: new FormControl(),
    irpf: new FormControl(),
    iva: new FormControl(),
    total_amount: new FormControl(0, [Validators.required, Validators.min(1)]),
    total_amount_irpf: new FormControl(),
    subsidy_id: new FormControl<number | null>({
      value: null,
      disabled: true,
    }),
    project_id: new FormControl<number | null>({
      value: null,
      disabled: true,
    }),
    invoice_file: new FormControl<string | File | null>(null), // 🔹 Acepta string, File o null
  });
  subsidies: SubsidyModel[] = [];
  projects: ProjectModel[] = [];
  currentYear = this.generalService.currentYear;
  isCreate = false;
  private loadedYearData: number | null = null;

  ngOnInit(): void {
    this.isCreate = this.itemId !== 0;
    this.years = this.generalService.loadYears(this.currentYear, 2018);

    if (this.itemId) {
      this.invoicesFacade.loadInvoiceById(this.itemId);
      this.invoicesFacade.selectedInvoice$
        .pipe(
          takeUntilDestroyed(this.destroyRef),
          filter((invoice: InvoiceModelFullData | null) => invoice !== null),
          tap((invoice: InvoiceModelFullData | null) => {
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
                subsidy_id: invoice.subsidy_id,
                project_id: invoice.project_id,
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

              this.titleForm = 'Editar Factura';
              this.buttonAction = 'Guardar cambios';
            }
          })
        )
        .subscribe();
    }
    this.formInvoice
      .get('date_invoice')
      ?.valueChanges.pipe(
        takeUntilDestroyed(this.destroyRef),
        // filter(() => !this.isCreate), // Evita llamadas al editar
        tap((date_invoice: string | null) => {
          console.log('🗓 Fecha seleccionada en factura:', date_invoice);
          if (date_invoice) {
            const year = this.generalService.getYearFromDate(date_invoice);
            this.loadYearlyData(year).subscribe();
            this.generalService.enableInputControls(this.formInvoice, [
              'project_id',
              'subsidy_id',
            ]);
          } else {
            this.generalService.disableInputControls(this.formInvoice, [
              'project_id',
              'subsidy_id',
            ]);
          }
        })
      )
      .subscribe();
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

  loadSubsidiesByYear(year: number): Observable<SubsidyModel[]> {
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
          const isValid =
            creditors.some(
              (creditor) =>
                creditor.company === value || value.includes(creditor.company)
            ) || !!this.formInvoice.value.creditor_id;

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
    this.submitted = true;
    if (this.formInvoice.invalid) {
      console.warn('⚠️ Formulario inválido', this.formInvoice.errors);
      return;
    }

    const creditorId = this.formInvoice.value.creditor_id;
    const enteredCreditor = this.searchInput.value?.trim() || '';

    const isValidCreditor =
      typeof creditorId === 'number' ||
      this.creditors.some((c) => enteredCreditor.includes(c.company));

    if (!isValidCreditor) {
      this.formInvoice.get('creditor_id')?.setErrors({ notRegistered: true });
      console.warn('⚠️ Acreedor no válido');
      return;
    }

    // 👉 Obtener valores y convertir a tipo libre
    const rawValues = { ...this.formInvoice.getRawValue() } as any;

    // 👉 Separar el archivo (si es que lo hay)
    const fileOrUrl = rawValues.invoice_file;
    const selectedFile = fileOrUrl instanceof File ? fileOrUrl : null;

    // 👉 Limpiar campos innecesarios
    delete rawValues.invoice_file;

    // 👉 Si el valor es una URL (edición), agregarla
    if (typeof fileOrUrl === 'string') {
      rawValues.existingUrl = fileOrUrl;
    }

    // 👉 Crear FormData
    const formData = this.generalService.createFormData(
      rawValues,
      selectedFile,
      this.itemId
    );

    this.sendFormInvoice.emit({
      itemId: this.itemId,
      formData: formData,
    });
  }
}
