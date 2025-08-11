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
import { GeneralService } from 'src/app/shared/services/generalService.service';
import { PdfControlComponent } from '../../../../components/pdf-control/pdf-control.component';

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
  typeList = TypeList.Invoices;
  previewPdfValue: string | File | null = null;
  selectedPdfValue: string | File | null = null;
  formInvoice = new FormGroup({
    number_invoice: new FormControl(''),
    type_invoice: new FormControl('', [Validators.required]),
    date_invoice: new FormControl('', [Validators.required]), // String para el input de tipo date
    date_accounting: new FormControl(''),
    date_payment: new FormControl(''),
    creditor_id: new FormControl<number | null>(null),
    description: new FormControl('', [Validators.maxLength(2000)]),
    amount: new FormControl(0, [Validators.required, Validators.min(1)]),
    irpf: new FormControl(0),
    iva: new FormControl(0),
    total_amount: new FormControl(0),
    total_amount_irpf: new FormControl(0),
    subsidy_id: new FormControl<number | null>({
      value: null,
      disabled: true,
    }),
    project_id: new FormControl<number | null>({
      value: null,
      disabled: true,
    }),
    invoice_pdf: new FormControl<string | File | null>(null),
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
                creditor_id: invoice.creditor_id,
                description: invoice.description || '',
                amount: invoice.amount || 0,
                irpf: invoice.irpf || 0,
                iva: invoice.iva || 0,
                total_amount: invoice.total_amount || 0,
                total_amount_irpf: invoice.total_amount_irpf || 0,
                subsidy_id: invoice.subsidy_id,
                project_id: invoice.project_id,
                invoice_pdf: invoice.invoice_pdf || '',
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
              this.titleForm = 'Editar Factura';
              this.buttonAction = 'Guardar cambios';
            }
          })
        )
        .subscribe();
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
          if (date_invoice && type_invoice === 'Factura') {
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
    // total_amount = amount + iva - irpf
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
          // Convertir los valores a números
          const parsedAmount = Number(amount) || 0;
          const parsedIva = Number(iva) || 0;
          const parsedIrpf = Number(irpf) || 0;

          // Calcular el total_amount
          const total = parsedAmount + parsedIva - parsedIrpf;

          // Asignar el valor al campo total_amount
          this.formInvoice
            .get('total_amount')
            ?.setValue(total, { emitEvent: false });
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
      irpf: 0,
      iva: 0,
      total_amount_irpf: 0,
      invoice_pdf: '', // Asegúrate de asignar un valor predeterminado a 'invoice_pdf'
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
    const pdf = rawValues.invoice_pdf;
    let selectedPdf = null;

    // Verificar si el valor es un archivo
    if (pdf instanceof File) {
      selectedPdf = pdf;
    } else if (typeof pdf === 'string' && pdf.trim() !== '') {
      // Asignar el valor de URL existente
      rawValues.existingUrl = pdf;
    } else {
      // Si el valor es nulo, vacío o indefinido, asignar un valor vacío
      rawValues.existingUrl = '';
    }

    // Eliminar invoice_pdf de rawValues antes de pasarlo
    delete rawValues.invoice_pdf;

    // Crear FormData usando el método createFormData de generalService
    const formData = this.generalService.createFormData(
      rawValues,
      { url: selectedPdf }, // Se añade el archivo PDF (o la URL si es una cadena)
      this.itemId // itemId: El id de la factura, ya sea para edición o nueva
    );

    // Emitir el formulario con formData
    this.sendFormInvoice.emit({
      itemId: this.itemId,
      formData: formData,
    });

    // Limpiar el acreedor después de enviar
    // this.resetCreditor();
  }

  // resetCreditor(): void {
  //   this.searchInput.reset(''); // limpia el input de texto
  //   this.formInvoice.get('creditor_id')?.reset(null); // limpia el id de acreedor
  //   this.creditors = []; // limpia sugerencias
  // }
}
