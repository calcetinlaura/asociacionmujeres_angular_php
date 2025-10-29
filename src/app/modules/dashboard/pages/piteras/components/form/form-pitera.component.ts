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
import {
  FormControl,
  FormGroup,
  ReactiveFormsModule,
  Validators,
} from '@angular/forms';
import { MatCardModule } from '@angular/material/card';
import { QuillModule } from 'ngx-quill';
import { filter, tap } from 'rxjs';
import { ImageControlComponent } from 'src/app/shared/components/image-control/image-control.component';
import { PdfControlComponent } from 'src/app/shared/components/pdf-control/pdf-control.component';
import { SpinnerLoadingComponent } from 'src/app/shared/components/spinner-loading/spinner-loading.component';
import { ScrollToFirstErrorDirective } from 'src/app/shared/directives/scroll-to-first-error.directive';

import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { PiterasFacade } from 'src/app/application/piteras.facade';
import { PiteraModel } from 'src/app/core/interfaces/pitera.interface';
import { TypeList } from 'src/app/core/models/general.model';
import { GeneralService } from 'src/app/core/services/generalService.service';

@Component({
  selector: 'app-form-pitera',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatCardModule,
    ImageControlComponent,
    PdfControlComponent,
    QuillModule,
    SpinnerLoadingComponent,
    ScrollToFirstErrorDirective,
  ],
  templateUrl: './form-pitera.component.html',
  styleUrls: ['./../../../../../../shared/components/form/form.component.css'],
})
export class FormPiteraComponent implements OnInit {
  readonly piterasFacade = inject(PiterasFacade);
  private readonly generalService = inject(GeneralService);
  private readonly destroyRef = inject(DestroyRef);

  @Input() itemId!: number;
  @Input() item: PiteraModel | null = null;
  @Output() submitForm = new EventEmitter<{
    itemId: number;
    formData: FormData;
  }>();

  formPitera = new FormGroup({
    title: new FormControl('', [Validators.required]),
    publication_number: new FormControl<number | null>(null, [
      Validators.required,
      Validators.min(0),
      Validators.max(100),
    ]),
    theme: new FormControl(''),
    description: new FormControl('', [Validators.maxLength(2000)]),
    summary: new FormControl('', [Validators.maxLength(300)]),
    url: new FormControl<string | File | null>(null),
    img: new FormControl(''),
    year: new FormControl<number | null>(null, [
      Validators.required,
      Validators.min(1995),
      Validators.max(new Date().getFullYear()),
    ]),
    pages: new FormControl<number | null>(null, [
      Validators.min(0),
      Validators.max(300),
    ]),
  });

  titleForm = 'Registrar Pitera';
  buttonAction = 'Guardar';
  selectedImageFile: File | null = null;
  imageSrc = '';
  submitted = false;
  years: number[] = [];
  currentYear = this.generalService.currentYear;
  typeList = TypeList.Piteras;

  quillModules = this.generalService.defaultQuillModules;

  ngOnInit(): void {
    this.years = this.generalService.loadYears(this.currentYear, 1995);

    // Si el item viene directamente desde la modal
    if (this.item) {
      this.patchForm(this.item);
      return;
    }

    if (this.itemId) {
      this.piterasFacade.loadPiteraById(this.itemId);
      this.piterasFacade.selectedPitera$
        .pipe(
          takeUntilDestroyed(this.destroyRef),
          filter((pitera): pitera is PiteraModel => !!pitera),
          tap((pitera) => this.patchForm(pitera))
        )
        .subscribe();
    }
  }

  // 🧩 Hidrata el formulario con datos del backend o modal
  private patchForm(pitera: PiteraModel): void {
    this.formPitera.patchValue({
      title: pitera.title ?? '',
      publication_number: pitera.publication_number ?? null,
      theme: pitera.theme ?? '',
      description: pitera.description ?? '',
      summary: pitera.summary ?? '',
      url: pitera.url ?? '',
      img: pitera.img ?? '',
      year: Number(pitera.year) || null,
      pages: pitera.pages ?? null,
    });

    this.titleForm = 'Editar Pitera';
    this.buttonAction = 'Guardar cambios';

    if (pitera.img) {
      this.imageSrc = pitera.img;
      this.selectedImageFile = null;
    }
  }

  // 📷 Imagen
  async onImageSelected(file: File) {
    const result = await this.generalService.handleFileSelection(file);
    this.selectedImageFile = result.file;
    this.imageSrc = result.imageSrc;
  }

  // 📄 PDF
  onPdfSelected(event: Event): void {
    const file = this.generalService.validateAndExtractPdf(event);
    if (file) this.formPitera.patchValue({ url: file });
  }

  getPiteraPdfPreview(): string | null {
    const val = this.formPitera.get('url')?.value;
    return typeof val === 'string' ? val : null;
  }

  // 🚀 Envío
  onSendFormPitera(): void {
    if (this.formPitera.invalid) {
      this.submitted = true;
      this.formPitera.markAllAsTouched();
      return;
    }

    const rawValues = { ...this.formPitera.getRawValue() } as any;

    ['theme', 'description', 'summary'].forEach((field) => {
      if (rawValues[field])
        rawValues[field] = rawValues[field].replace(/&nbsp;/g, ' ');
    });

    const pdfVal = rawValues.url;
    const pdfFile = pdfVal instanceof File ? pdfVal : null;
    if (typeof pdfVal === 'string') rawValues.existingUrl = pdfVal;
    delete rawValues.url;

    if (this.imageSrc && !this.selectedImageFile)
      rawValues.existingImg = this.imageSrc;

    const formData = this.generalService.createFormData(
      rawValues,
      { url: pdfFile, img: this.selectedImageFile },
      this.itemId
    );

    this.submitForm.emit({ itemId: this.itemId, formData });
  }

  descriptionLen(): number {
    return (this.formPitera.get('description')?.value || '').length;
  }
  summaryLen(): number {
    return (this.formPitera.get('summary')?.value || '').length;
  }
}
