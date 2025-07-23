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
import { MatCardModule } from '@angular/material/card';

import townsData from 'data/towns.json';
import { QuillModule } from 'ngx-quill';
import { filter, tap } from 'rxjs';
import { MacroeventsFacade } from 'src/app/application/macroevents.facade';
import { MacroeventModel } from 'src/app/core/interfaces/macroevent.interface';
import { TypeList } from 'src/app/core/models/general.model';
import { ImageControlComponent } from 'src/app/modules/dashboard/components/image-control/image-control.component';
import { GeneralService } from 'src/app/shared/services/generalService.service';
import { dateRangeValidator } from 'src/app/shared/utils/validators.utils';

@Component({
  selector: 'app-form-macroevent',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatCardModule,
    ImageControlComponent,
    QuillModule,
  ],
  templateUrl: './form-macroevent.component.html',
  styleUrls: ['../../../../components/form/form.component.css'],
})
export class FormMacroeventComponent implements OnInit {
  private readonly destroyRef = inject(DestroyRef);
  private readonly macroeventsFacade = inject(MacroeventsFacade);
  private readonly generalService = inject(GeneralService);
  @Input() itemId!: number;
  @Output() sendFormMacroevent = new EventEmitter<{
    itemId: number;
    formData: FormData;
  }>();

  selectedImageFile: File | null = null;
  imageSrc: string = '';
  errorSession: boolean = false;
  submitted: boolean = false;
  titleForm: string = 'Registrar macroevento';
  buttonAction: string = 'Guardar';
  typeList = TypeList.Macroevents;

  formMacroevent = new FormGroup(
    {
      title: new FormControl('', [Validators.required]),
      start: new FormControl('', [Validators.required]),
      end: new FormControl('', [Validators.required]),
      description: new FormControl('', [Validators.maxLength(2000)]),
      province: new FormControl(''),
      town: new FormControl(''),
      img: new FormControl(''),
    },
    { validators: dateRangeValidator }
  );

  provincias: {
    label: string;
    code: string;
    towns: { label: string; code: string }[];
  }[] = [];
  municipios: { label: string; code: string }[] = [];
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
    this.provincias = townsData
      .flatMap((region) => region.provinces)
      .sort((a, b) => a.label.localeCompare(b.label));

    if (this.itemId) {
      this.macroeventsFacade.loadMacroeventById(this.itemId);
      this.macroeventsFacade.selectedMacroevent$
        .pipe(
          takeUntilDestroyed(this.destroyRef),
          filter(
            (event: MacroeventModel | null): event is MacroeventModel => !!event
          ),
          tap((event: MacroeventModel) => {
            const province = this.provincias.find(
              (p) => p.label === event.province
            );
            this.municipios = province?.towns ?? [];

            this.formMacroevent.patchValue({
              title: event.title,
              start: event.start,
              end: event.end,
              description: event.description,
              province: event.province,
              town: event.town,
              img: event.img,
            });

            this.titleForm = 'Editar Macroevento';
            this.buttonAction = 'Guardar cambios';

            if (event.img) {
              this.imageSrc = event.img;
              this.selectedImageFile = null;
            }
          })
        )
        .subscribe();
    }
  }

  onProvinceChange(): void {
    const selectedProvince = this.formMacroevent.value.province;
    const province = this.provincias.find((p) => p.label === selectedProvince);
    this.municipios = province?.towns ?? [];
    this.formMacroevent.patchValue({ town: '' });
  }

  async onImageSelected(file: File) {
    const result = await this.generalService.handleFileSelection(file);
    this.selectedImageFile = result.file;
    this.imageSrc = result.imageSrc;
  }

  onSendFormMacroevent(): void {
    if (this.formMacroevent.invalid) {
      this.submitted = true;
      console.warn('⚠️ Formulario inválido', this.formMacroevent.errors);
      return;
    }

    const rawValues = { ...this.formMacroevent.getRawValue() } as any;
    if (rawValues.description) {
      rawValues.description = rawValues.description.replace(/&nbsp;/g, ' ');
    }
    const formData = this.generalService.createFormData(
      rawValues,
      {
        img: this.selectedImageFile,
      },
      this.itemId
    );
  }
}
