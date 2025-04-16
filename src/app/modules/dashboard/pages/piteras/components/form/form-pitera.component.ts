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

@Component({
  selector: 'app-form-pitera',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    EditorModule,
    MatCardModule,
    ImageControlComponent,
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
    const input = event.target as HTMLInputElement;
    if (input.files && input.files.length > 0) {
      const file = input.files[0];

      if (file.type === 'application/pdf') {
        this.formPitera.patchValue({ url: file });
      } else {
        console.warn('⚠️ Formato incorrecto. Selecciona un archivo PDF.');
      }
    } else {
      console.warn('⚠️ No se seleccionó ningún archivo.');
    }
  }

  onSendFormPitera(): void {
    if (this.formPitera.invalid) {
      this.submitted = true;
      console.log('⚠️ Formulario inválido', this.formPitera.errors);
      return;
    }

    const formData = new FormData();
    formData.append('title', this.formPitera.value.title!);
    formData.append('theme', this.formPitera.value.theme || '');
    formData.append('year', this.formPitera.value.year!.toString());

    // 🔹 Si `url` es un archivo, añadirlo al `FormData`
    if (this.formPitera.value.url instanceof File) {
      formData.append('url', this.formPitera.value.url);
    } else if (typeof this.formPitera.value.url === 'string') {
      formData.append('existingUrl', this.formPitera.value.url); // 🔹 Enviar URL como string si ya existe
    }

    // 🔹 Si hay imagen seleccionada, agregarla
    if (this.selectedImageFile) {
      formData.append('img', this.selectedImageFile);
    } else if (this.imageSrc) {
      formData.append('existingImg', this.imageSrc);
    }

    if (this.itemId) {
      formData.append('_method', 'PATCH');
      formData.append('id', this.itemId.toString());
    }

    console.log(
      '📤 Enviando FormData:',
      Object.fromEntries((formData as any).entries())
    );

    this.sendFormPitera.emit({ itemId: this.itemId, formData: formData });
  }
}
