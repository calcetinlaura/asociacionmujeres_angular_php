import { CommonModule } from '@angular/common';
import { Component, EventEmitter, inject, Input, Output } from '@angular/core';
import {
  FormControl,
  FormGroup,
  ReactiveFormsModule,
  Validators,
} from '@angular/forms';
import { MatCardModule } from '@angular/material/card';

import { QuillModule } from 'ngx-quill';
import { filter, tap } from 'rxjs';
import { PiterasFacade } from 'src/app/application/piteras.facade';
import { PiteraModel } from 'src/app/core/interfaces/pitera.interface';
import { TypeList } from 'src/app/core/models/general.model';
import { ImageControlComponent } from 'src/app/modules/dashboard/components/image-control/image-control.component';
import { SpinnerLoadingComponent } from 'src/app/shared/components/spinner-loading/spinner-loading.component';
import { ScrollToFirstErrorDirective } from 'src/app/shared/directives/scroll-to-first-error.directive';
import { GeneralService } from 'src/app/shared/services/generalService.service';
import { PdfControlComponent } from '../../../../components/pdf-control/pdf-control.component';

@Component({
  selector: 'app-form-pitera',
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
  styleUrls: ['../../../../components/form/form.component.css'],
})
export class FormPiteraComponent {
  private piterasFacade = inject(PiterasFacade);
  private generalService = inject(GeneralService);

  @Input() itemId!: number;
  @Output() submitForm = new EventEmitter<{
    itemId: number;
    formData: FormData;
  }>();

  selectedImageFile: File | null = null;
  piteraData: any;
  imageSrc: string = '';
  submitted: boolean = false;
  titleForm: string = 'Registrar Pitera';
  buttonAction: string = 'Guardar';
  years: number[] = [];
  typeList = TypeList.Piteras;

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
    url: new FormControl<string | File | null>(null), // 🔹 Acepta string, File o null
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
    this.years = this.generalService.loadYears(this.currentYear, 1995);

    if (this.itemId) {
      this.piterasFacade.loadPiteraById(this.itemId);
      this.piterasFacade.selectedPitera$
        .pipe(
          filter((pitera: PiteraModel | null) => pitera !== null),
          tap((pitera: PiteraModel | null) => {
            if (pitera) {
              this.formPitera.patchValue({
                description: pitera.description || '',
                summary: pitera.summary || '',
                theme: pitera.theme || '',
                title: pitera.title || '',
                publication_number: pitera.publication_number || 0,
                url: pitera.url || '',
                img: pitera.img || '',
                year: Number(pitera.year) || 0,
                pages: pitera.pages || null,
              });

              this.titleForm = 'Editar Pitera';
              this.buttonAction = 'Guardar cambios';
              if (pitera.img) {
                this.imageSrc = pitera.img;
                this.selectedImageFile = null;
              }
            }
            this.isLoading = false;
          })
        )
        .subscribe();
    } else {
      this.isLoading = false;
    }
  }

  async onImageSelected(file: File) {
    const result = await this.generalService.handleFileSelection(file);
    this.selectedImageFile = result.file;
    this.imageSrc = result.imageSrc;
  }

  onPdfSelected(event: Event): void {
    const file = this.generalService.validateAndExtractPdf(event);
    if (file) {
      this.formPitera.patchValue({ url: file }); // o url, si es en `formPitera`
    }
  }

  getPiteraPdfPreview(): string | null {
    const val = this.formPitera.get('url')?.value;
    return typeof val === 'string' ? val : null;
  }

  onSendFormPitera(): void {
    if (this.formPitera.invalid) {
      this.submitted = true;
      console.warn('⚠️ Formulario inválido', this.formPitera.errors);
      return;
    }

    const rawValues = { ...this.formPitera.getRawValue() } as any;
    if (rawValues.theme) {
      rawValues.theme = rawValues.theme.replace(/&nbsp;/g, ' ');
    }
    const pdf = rawValues.url;
    const selectedPdf = pdf instanceof File ? pdf : null;
    if (typeof pdf === 'string') {
      rawValues.existingUrl = pdf;
    }
    delete rawValues.url;

    if (this.imageSrc && !this.selectedImageFile) {
      rawValues.existingImg = this.imageSrc;
    }

    const formData = this.generalService.createFormData(
      rawValues,
      {
        url: selectedPdf,
        img: this.selectedImageFile,
      },
      this.itemId
    );

    this.submitForm.emit({
      itemId: this.itemId,
      formData: formData,
    });
  }
  descriptionLen(): number {
    return (this.formPitera.get('description')?.value || '').length;
  }
  summaryLen(): number {
    return (this.formPitera.get('summary')?.value || '').length;
  }
}
