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

import { ButtonIconComponent } from 'src/app/shared/components/buttons/button-icon/button-icon.component';
import { ButtonSelectComponent } from 'src/app/shared/components/buttons/button-select/button-select.component';
import { CardEventMiniComponent } from 'src/app/shared/components/cards/card-events-min/card-events.min.component';
import { ImageControlComponent } from 'src/app/shared/components/image-control/image-control.component';
import { SpinnerLoadingComponent } from 'src/app/shared/components/spinner-loading/spinner-loading.component';
import { ScrollToFirstErrorDirective } from 'src/app/shared/directives/scroll-to-first-error.directive';
import { dateRangeValidator } from 'src/app/shared/utils/validators.utils';

@Component({
  selector: 'app-form-project',
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatCardModule,
    QuillModule,
    ImageControlComponent,
    SpinnerLoadingComponent,
    ScrollToFirstErrorDirective,
    ButtonIconComponent,
    ButtonSelectComponent,
    CardEventMiniComponent,
  ],
  templateUrl: './form-project.component.html',
  styleUrls: ['./../../../../../../shared/components/form/form.component.css'],
})
export class FormProjectComponent implements OnInit {
  readonly projectsFacade = inject(ProjectsFacade);
  private readonly destroyRef = inject(DestroyRef);
  private readonly subsidiesService = inject(SubsidiesService);
  private readonly generalService = inject(GeneralService);

  // === Inputs / Outputs ===
  @Input() itemId!: number;
  @Input() item: ProjectModelFullData | null = null;
  @Input() prefillFromSubsidy?: {
    year: number;
    subsidyId: number;
    subsidyName?: string;
  };
  @Output() submitForm = new EventEmitter<{
    itemId: number;
    formData: FormData;
  }>();

  // === Form ===
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
      subsidy_name: new FormControl({ value: '', disabled: true }),
      img: new FormControl(''),
      activities: new FormArray([]),
    },
    { validators: dateRangeValidator }
  );

  // === State ===
  selectedImageFile: File | null = null;
  imageSrc = '';
  submitted = false;
  titleForm = 'Registrar proyecto';
  buttonAction = 'Guardar';
  projectTypeSubsidy: 'SUBSIDIZED' | 'UNSUBSIDIZED' | 'UNDEFINED' = 'UNDEFINED';
  events: EventModelFullData[] = [];
  subsidies: SubsidyModelFullData[] = [];
  years: number[] = [];
  currentYear = this.generalService.currentYear;
  readonly TypeList = TypeList;

  // === Quill ===
  quillModules = this.generalService.defaultQuillModules;

  // =====================================================
  // 🧭 CICLO DE VIDA
  // =====================================================
  ngOnInit(): void {
    this.years = this.generalService.loadYears(this.currentYear, 2018);

    // Caso 1: Edición con item cargado directamente
    if (this.item) {
      this.patchForm(this.item);
      return;
    }

    // Caso 2: Carga asincrónica desde backend por ID
    if (this.itemId) {
      this.projectsFacade.loadProjectById(this.itemId);
      this.projectsFacade.selectedProject$
        .pipe(
          takeUntilDestroyed(this.destroyRef),
          filter((p): p is ProjectModelFullData => !!p),
          tap((project) => {
            this.patchForm(project);
          })
        )
        .subscribe();
      return;
    }

    // Caso 3: Prefill desde Subvención
    if (this.prefillFromSubsidy) {
      const { year, subsidyId, subsidyName } = this.prefillFromSubsidy;
      this.formProject.controls.year.setValue(year);
      this.formProject.controls.year.disable({ emitEvent: false });

      this.loadSubisidiesByYear(year)
        .pipe(takeUntilDestroyed(this.destroyRef))
        .subscribe(() => {
          this.formProject.controls.subsidy_id.enable({ emitEvent: false });
          this.formProject.controls.subsidy_id.setValue(subsidyId, {
            emitEvent: false,
          });
          this.formProject.controls.subsidy_id.disable({ emitEvent: false });
          this.formProject.controls.subsidy_name?.setValue(subsidyName ?? '', {
            emitEvent: false,
          });
          this.projectTypeSubsidy = 'SUBSIDIZED';
        });
      return;
    }
  }

  // =====================================================
  // 🧩 FORM HELPERS
  // =====================================================
  private patchForm(project: ProjectModelFullData) {
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

    if (project.activities?.length) {
      this.setActivities(project.activities);
    }

    if (typeof project.year === 'number') {
      this.loadSubisidiesByYear(project.year).subscribe(() => {
        this.formProject.controls.subsidy_id.enable();
      });
    }

    if (project.img) {
      this.imageSrc = project.img;
      this.selectedImageFile = null;
    }

    this.events = project.events || [];
    this.titleForm = 'Editar Proyecto';
    this.buttonAction = 'Guardar cambios';
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

  trackByActivityId(index: number, activity: AbstractControl): any {
    const formGroup = activity as FormGroup;
    return formGroup.get('activity_id')?.value || index;
  }

  // =====================================================
  // 📦 SERVICIOS Y CARGA
  // =====================================================
  loadSubisidiesByYear(year: number): Observable<SubsidyModelFullData[]> {
    return this.subsidiesService
      .getSubsidiesByYear(year)
      .pipe(tap((subs) => (this.subsidies = subs)));
  }

  async onImageSelected(file: File) {
    const result = await this.generalService.handleFileSelection(file);
    this.selectedImageFile = result.file;
    this.imageSrc = result.imageSrc;
  }

  // =====================================================
  // 🚀 ENVÍO DEL FORMULARIO
  // =====================================================
  onSendFormProject(): void {
    if (this.formProject.invalid) {
      this.submitted = true;
      this.formProject.markAllAsTouched();
      return;
    }

    // Copia tipada del valor del formulario
    const rawValues = this.formProject.getRawValue() as {
      description: string | null;
      activities?: Array<{
        name?: string;
        attendant?: string;
        observations?: string;
        [key: string]: any;
      }>;
      [key: string]: any;
    };

    const sanitize = (s: string) => s.replace(/&nbsp;/g, ' ').trim();
    const cleanToNull = (v: unknown): string | null =>
      typeof v === 'string' ? sanitize(v) : null;
    const cleanToEmpty = (v: unknown): string =>
      typeof v === 'string' ? sanitize(v) : '';

    // Limpieza de texto simple
    rawValues.description = cleanToNull(rawValues.description);

    // Limpieza de actividades sin reasignar tipo incompatible
    const cleanedActivities =
      rawValues.activities?.map((a) => ({
        ...a,
        name: cleanToEmpty(a.name),
        attendant: cleanToEmpty(a.attendant),
        observations: cleanToEmpty(a.observations),
      })) ?? [];

    const formData = this.generalService.createFormData(
      { ...rawValues, activities: cleanedActivities },
      { img: this.selectedImageFile },
      this.itemId
    );

    this.submitForm.emit({ itemId: this.itemId, formData });
  }

  // =====================================================
  // 🧮 UTILIDADES
  // =====================================================
  descriptionLen(): number {
    return (this.formProject.get('description')?.value || '').length;
  }
  observationsLen(): number {
    return (this.formProject.get('observations')?.value || '').length;
  }
}
