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
  AbstractControl,
  FormArray,
  FormControl,
  FormGroup,
  ReactiveFormsModule,
  Validators,
} from '@angular/forms';
import { MatCardModule } from '@angular/material/card';

import { QuillModule } from 'ngx-quill';
import { filter, Observable, tap } from 'rxjs';
import { ProjectsFacade } from 'src/app/application/projects.facade';
import { EventModelFullData } from 'src/app/core/interfaces/event.interface';
import { ProjectModelFullData } from 'src/app/core/interfaces/project.interface';
import { SubsidyModelFullData } from 'src/app/core/interfaces/subsidy.interface';
import { TypeList } from 'src/app/core/models/general.model';
import { GeneralService } from 'src/app/core/services/generalService.service';
import { SubsidiesService } from 'src/app/core/services/subsidies.services';
import { ButtonSelectComponent } from 'src/app/shared/components/buttons/button-select/button-select.component';
import { CardEventMiniComponent } from 'src/app/shared/components/cards/card-events-min/card-events.min.component';
import { ImageControlComponent } from 'src/app/shared/components/image-control/image-control.component';
import { SpinnerLoadingComponent } from 'src/app/shared/components/spinner-loading/spinner-loading.component';
import { ScrollToFirstErrorDirective } from 'src/app/shared/directives/scroll-to-first-error.directive';
import { dateRangeValidator } from 'src/app/shared/utils/validators.utils';
import { ButtonIconComponent } from '../../../../../../shared/components/buttons/button-icon/button-icon.component';

@Component({
  selector: 'app-form-project',
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatCardModule,
    ImageControlComponent,
    ButtonIconComponent,
    QuillModule,
    SpinnerLoadingComponent,
    ButtonSelectComponent,
    ScrollToFirstErrorDirective,

    CardEventMiniComponent,
  ],
  templateUrl: './form-project.component.html',
  styleUrls: ['./../../../../../../shared/components/form/form.component.css'],
})
export class FormProjectComponent implements OnInit {
  private readonly destroyRef = inject(DestroyRef);
  private readonly projectsFacade = inject(ProjectsFacade);
  private readonly subsidiesService = inject(SubsidiesService);
  private readonly generalService = inject(GeneralService);

  @Input() itemId!: number;

  @Input() prefillFromSubsidy?: {
    year: number;
    subsidyId: number;
    subsidyName?: string;
  };
  @Output() submitForm = new EventEmitter<{
    itemId: number;
    formData: FormData;
  }>();
  events: EventModelFullData[] = [];
  formProject = new FormGroup(
    {
      title: new FormControl('', [Validators.required]),
      year: new FormControl<number | null>(null, [
        Validators.required,
        Validators.min(2000),
      ]),
      description: new FormControl('', [Validators.maxLength(500)]),
      subsidy_id: new FormControl<number | null>({
        value: null,
        disabled: true,
      }),
      subsidy_name: new FormControl({ value: '', disabled: true }), // ← solo visual
      img: new FormControl(''),
      activities: new FormArray([]),
    },
    { validators: dateRangeValidator }
  );
  projectTypeSubsidy: 'SUBSIDIZED' | 'UNSUBSIDIZED' | 'UNDEFINED' = 'UNDEFINED';
  selectedImageFile: File | null = null;
  imageSrc = '';
  submitted = false;
  titleForm = 'Registrar proyecto';
  buttonAction = 'Guardar';
  typeList = TypeList;
  years: number[] = [];
  subsidies: SubsidyModelFullData[] = [];
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
    this.years = this.generalService.loadYears(this.currentYear, 2018);

    // Tu suscripción a year.valueChanges se queda igual
    this.formProject.controls.year.valueChanges
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        tap((year) => {
          const subsidyControl = this.formProject.controls.subsidy_id;
          if (typeof year === 'number' && year >= 2000) {
            this.loadSubisidiesByYear(year).subscribe(() =>
              subsidyControl.enable()
            );
          } else {
            subsidyControl.disable();
          }
        })
      )
      .subscribe();

    // --- Si EDITAS un proyecto, se mantiene tu lógica tal cual ---
    if (this.itemId) {
      this.projectsFacade.loadProjectById(this.itemId);
      this.projectsFacade.selectedProject$
        .pipe(
          takeUntilDestroyed(this.destroyRef),
          filter(
            (
              event: ProjectModelFullData | null
            ): event is ProjectModelFullData => !!event
          ),
          tap((project: ProjectModelFullData) => {
            this.formProject.patchValue({
              title: project.title,
              year: project.year,
              description: project.description,
              subsidy_id: project.subsidy_id,
              img: project.img,
            });
            if (project.subsidy_id) {
              this.projectTypeSubsidy = 'SUBSIDIZED';
            }
            this.setActivities(project.activities || []);
            if (typeof project.year === 'number') {
              this.loadSubisidiesByYear(project.year).subscribe(() => {
                this.formProject.controls.subsidy_id.enable();
              });
            }
            this.titleForm = 'Editar Proyecto';
            this.buttonAction = 'Guardar cambios';
            if (project.img) {
              this.imageSrc = project.img;
              this.selectedImageFile = null;
            }
            this.events = project.events || [];
            this.isLoading = false;
          })
        )
        .subscribe();
    }

    // --- Si CREAS y vienes desde Subvención: prefill + bloquear ---
    if (this.prefillFromSubsidy) {
      const { year, subsidyId, subsidyName } = this.prefillFromSubsidy;

      // Fijar y bloquear el año
      this.formProject.controls.year.setValue(year, { emitEvent: false });
      this.formProject.controls.year.disable({ emitEvent: false });

      // Cargar subvenciones del año, fijar y bloquear subsidy_id
      this.loadSubisidiesByYear(year)
        .pipe(takeUntilDestroyed(this.destroyRef))
        .subscribe(() => {
          this.formProject.controls.subsidy_id.enable({ emitEvent: false });
          this.formProject.controls.subsidy_id.setValue(subsidyId, {
            emitEvent: false,
          });
          this.formProject.controls.subsidy_id.disable({ emitEvent: false });
          if (subsidyName) {
            this.formProject.controls.subsidy_name?.setValue(subsidyName, {
              emitEvent: false,
            });
          }
          this.projectTypeSubsidy = 'SUBSIDIZED';
          this.isLoading = false;
        });
    } else {
      this.isLoading = false;
    }
  }
  trackByActivityId(index: number, activity: AbstractControl): any {
    const formGroup = activity as FormGroup;
    return formGroup.get('activity_id')?.value || index; // Usa index como fallback si activity_id es null
  }

  setActivities(activities: any[]): void {
    this.activities.clear();
    activities.forEach((act) => this.addActivity(act));
  }

  setProjectTypeSubsidy(
    type: 'SUBSIDIZED' | 'UNSUBSIDIZED' | 'UNDEFINED'
  ): void {
    this.projectTypeSubsidy = type;
    this.formProject.patchValue({ subsidy_id: null });
  }

  get activities(): FormArray {
    return this.formProject.get('activities') as FormArray;
  }

  addActivity(activityData: any = {}): void {
    const activityGroup = new FormGroup({
      activity_id: new FormControl(activityData.activity_id ?? null),
      name: new FormControl(activityData.name || '', Validators.required),
      budget: new FormControl(activityData.budget || 0),
      attendant: new FormControl(activityData.attendant || ''),
      observations: new FormControl(activityData.observations || ''),
    });

    this.activities.push(activityGroup);
  }

  removeActivity(index: number): void {
    this.activities.removeAt(index);
  }

  loadSubisidiesByYear(year: number): Observable<SubsidyModelFullData[]> {
    return this.subsidiesService.getSubsidiesByYear(year).pipe(
      tap((subsidies) => {
        this.subsidies = subsidies;
      })
    );
  }

  async onImageSelected(file: File) {
    const result = await this.generalService.handleFileSelection(file);
    this.selectedImageFile = result.file;
    this.imageSrc = result.imageSrc;
  }

  onSendFormProject(): void {
    if (this.formProject.invalid) {
      this.submitted = true;
      console.log('Formulario inválido', this.formProject.errors);
      return;
    }

    const rawValues = { ...this.formProject.getRawValue() } as any;
    // Util para limpiar '&nbsp;' y recortar
    const clean = (v: unknown) =>
      typeof v === 'string' ? v.replace(/&nbsp;/g, ' ').trim() : v;

    // Limpia descripción del proyecto
    rawValues.description = clean(rawValues.description);

    // Limpia cada actividad (observations, y ya que estamos attendant y name)
    rawValues.activities = (rawValues.activities ?? []).map((a: any) => ({
      ...a,
      name: clean(a.name) ?? '',
      attendant: clean(a.attendant) ?? '',
      observations: clean(a.observations) ?? '',
    }));

    const formData = this.generalService.createFormData(
      rawValues,
      {
        img: this.selectedImageFile,
      },
      this.itemId
    );

    this.submitForm.emit({
      itemId: this.itemId,
      formData: formData,
    });
  }
  observationsLen(): number {
    return (this.formProject.get('observations')?.value || '').length;
  }
  descriptionLen(): number {
    return (this.formProject.get('description')?.value || '').length;
  }
}
