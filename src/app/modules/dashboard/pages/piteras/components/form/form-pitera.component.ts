import { CommonModule } from '@angular/common';
import { Component, EventEmitter, inject, Input, Output } from '@angular/core';
import {
  FormControl,
  FormGroup,
  ReactiveFormsModule,
  Validators,
} from '@angular/forms';
import { MatCardModule } from '@angular/material/card';
import { EditorModule } from '@tinymce/tinymce-angular';
import { filter, tap } from 'rxjs';
import { PiterasFacade } from 'src/app/application/piteras.facade';
import { PiteraModel } from 'src/app/core/interfaces/pitera.interface';
import { TypeList } from 'src/app/core/models/general.model';
import { ImageControlComponent } from 'src/app/modules/dashboard/components/image-control/image-control.component';
import { GeneralService } from 'src/app/shared/services/generalService.service';
import { PdfControlComponent } from '../../../../components/pdf-control/pdf-control.component';

@Component({
  selector: 'app-form-pitera',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    EditorModule,
    MatCardModule,
    ImageControlComponent,
    PdfControlComponent,
  ],
  templateUrl: './form-pitera.component.html',
  styleUrls: ['../../../../components/form/form.component.css'],
})
export class FormPiteraComponent {
  private piterasFacade = inject(PiterasFacade);
  private generalService = inject(GeneralService);

  @Input() itemId!: number;
  @Output() sendFormPitera = new EventEmitter<{
    itemId: number;
    formData: FormData;
  }>();
  selectedImageFile: File | null = null;
  piteraData: any;
  imageSrc: string = '';
  errorSession: boolean = false;
  submitted: boolean = false;
  titleForm: string = 'Registrar Pitera';
  buttonAction: string = 'Guardar';
  years: number[] = [];
  typeList = TypeList.Piteras;

  formPitera = new FormGroup({
    title: new FormControl('', [Validators.required]),
    theme: new FormControl(''),
    url: new FormControl<string | File | null>(null), // 🔹 Acepta string, File o null
    img: new FormControl(''),
    year: new FormControl(0, [
      Validators.required,
      Validators.min(1995),
      Validators.max(new Date().getFullYear()),
    ]),
  });
  currentYear = this.generalService.currentYear;

  ngOnInit(): void {
    this.years = this.generalService.loadYears(this.currentYear, 1995);

    if (this.itemId) {
      this.piterasFacade.loadPiteraById(this.itemId);
      this.piterasFacade.selectedPitera$
        .pipe(
          filter((pitera: PiteraModel | null) => pitera !== null),
          tap((pitera: PiteraModel | null) => {
            if (pitera) {
              this.formPitera.patchValue({
                theme: pitera.theme || '',
                title: pitera.title || '',
                url: pitera.url || '',
                img: pitera.img || '',
                year: Number(pitera.year) || 0,
              });

              this.titleForm = 'Editar Pitera';
              this.buttonAction = 'Guardar cambios';
              if (pitera.img) {
                this.imageSrc = pitera.img;
                this.selectedImageFile = null;
              }
            }
          })
        )
        .subscribe();
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

    this.sendFormPitera.emit({
      itemId: this.itemId,
      formData: formData,
    });
  }
}
