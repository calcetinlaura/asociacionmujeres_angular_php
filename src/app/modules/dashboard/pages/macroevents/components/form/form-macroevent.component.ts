import { CommonModule } from '@angular/common';
import {
  Component,
  DestroyRef,
  EventEmitter,
  inject,
  Input,
  OnChanges,
  OnInit,
  Output,
  SimpleChanges,
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
import { filter, take, tap } from 'rxjs'; // 👈 añade take
import { MacroeventsFacade } from 'src/app/application/macroevents.facade';
import { MacroeventModel } from 'src/app/core/interfaces/macroevent.interface';
import { TypeList } from 'src/app/core/models/general.model';
import { GeneralService } from 'src/app/core/services/generalService.service';
import { ImageControlComponent } from 'src/app/shared/components/image-control/image-control.component';
import { SpinnerLoadingComponent } from 'src/app/shared/components/spinner-loading/spinner-loading.component';
import { ScrollToFirstErrorDirective } from 'src/app/shared/directives/scroll-to-first-error.directive';
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
    SpinnerLoadingComponent,
    ScrollToFirstErrorDirective,
  ],
  templateUrl: './form-macroevent.component.html',
  styleUrls: ['./../../../../../../shared/components/form/form.component.css'],
})
export class FormMacroeventComponent implements OnInit, OnChanges {
  private readonly destroyRef = inject(DestroyRef);
  private readonly macroeventsFacade = inject(MacroeventsFacade);
  private readonly generalService = inject(GeneralService);

  @Input() itemId!: number;
  @Output() submitForm = new EventEmitter<{
    itemId: number;
    formData: FormData;
  }>();

  selectedImageFile: File | null = null;
  imageSrc = '';
  submitted = false;
  titleForm = 'Registrar macroevento';
  buttonAction = 'Guardar';
  typeList = TypeList.Macroevents;

  formMacroevent = new FormGroup(
    {
      title: new FormControl('', [Validators.required]),
      start: new FormControl('', [Validators.required]),
      end: new FormControl('', [Validators.required]),
      description: new FormControl('', [Validators.maxLength(2000)]),
      summary: new FormControl('', [Validators.maxLength(300)]),
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
    // Provincias/municipios
    this.provincias = townsData
      .flatMap((r) => r.provinces)
      .sort((a, b) => a.label.localeCompare(b.label));

    if (this.itemId) {
      this.loadById(this.itemId);
    } else {
      this.setupCreateMode();
    }
  }

  ngOnChanges(changes: SimpleChanges): void {
    if ('itemId' in changes) {
      const id = changes['itemId'].currentValue as number;
      if (id) this.loadById(id);
      else this.setupCreateMode();
    }
  }

  private setupCreateMode(): void {
    this.isLoading = false;
    this.titleForm = 'Registrar macroevento';
    this.buttonAction = 'Guardar';
    this.imageSrc = '';
    this.selectedImageFile = null;
    this.municipios = [];
    this.formMacroevent.reset({
      title: '',
      start: '',
      end: '',
      description: '',
      summary: '',
      province: '',
      town: '',
      img: '',
    });
  }

  private loadById(id: number): void {
    this.isLoading = true;

    // Evita una primera emisión "vieja"
    this.macroeventsFacade.clearSelectedMacroevent();
    this.macroeventsFacade.loadMacroeventById(id);

    this.macroeventsFacade.selectedMacroevent$
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        filter(
          (m: MacroeventModel | null): m is MacroeventModel =>
            !!m && m.id === id
        ),
        take(1), // 👈 sólo el valor fresco del back
        tap((m) => this.populateFrom(m))
      )
      .subscribe();
  }

  private populateFrom(macroevent: MacroeventModel): void {
    const province = this.provincias.find(
      (p) => p.label === macroevent.province
    );
    this.municipios = province?.towns ?? [];

    this.formMacroevent.reset(); // limpia touched/dirty
    this.formMacroevent.patchValue({
      title: macroevent.title ?? '',
      start: macroevent.start ?? '',
      end: macroevent.end ?? '',
      description: macroevent.description ?? '',
      summary: macroevent.summary ?? '',
      province: macroevent.province ?? '',
      town: macroevent.town ?? '',
      img: macroevent.img ?? '',
    });

    this.titleForm = 'Editar Macroevento';
    this.buttonAction = 'Guardar cambios';

    this.imageSrc = macroevent.img || '';
    this.selectedImageFile = null;

    this.isLoading = false;
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
      return;
    }

    const rawValues = { ...this.formMacroevent.getRawValue() } as any;
    if (rawValues.description)
      rawValues.description = rawValues.description.replace(/&nbsp;/g, ' ');
    if (this.imageSrc && !this.selectedImageFile)
      rawValues.existingImg = this.imageSrc;

    const formData = this.generalService.createFormData(
      rawValues,
      { img: this.selectedImageFile },
      this.itemId
    );

    this.submitForm.emit({ itemId: this.itemId, formData });
  }
  descriptionLen(): number {
    return (this.formMacroevent.get('description')?.value || '').length;
  }
  summaryLen(): number {
    return (this.formMacroevent.get('summary')?.value || '').length;
  }
}
