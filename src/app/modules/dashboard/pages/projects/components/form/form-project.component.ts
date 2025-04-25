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
  FormArray,
  FormControl,
  FormGroup,
  ReactiveFormsModule,
  Validators,
} from '@angular/forms';
import { MatCardModule } from '@angular/material/card';
import { EditorModule } from '@tinymce/tinymce-angular';
import { filter, Observable, tap } from 'rxjs';
import { ProjectsFacade } from 'src/app/application/projects.facade';
import { ProjectModel } from 'src/app/core/interfaces/project.interface';
import { SubsidyModelFullData } from 'src/app/core/interfaces/subsidy.interface';
import { TypeList } from 'src/app/core/models/general.model';
import { SubsidiesService } from 'src/app/core/services/subsidies.services';
import { ImageControlComponent } from 'src/app/modules/dashboard/components/image-control/image-control.component';
import { GeneralService } from 'src/app/shared/services/generalService.service';
import { dateRangeValidator } from 'src/app/shared/utils/validators.utils';
import { ButtonIconComponent } from '../../../../../../shared/components/buttons/button-icon/button-icon.component';

@Component({
  selector: 'app-form-project',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    EditorModule,
    MatCardModule,
    ImageControlComponent,
    ButtonIconComponent,
  ],
  templateUrl: './form-project.component.html',
  styleUrls: ['../../../../components/form/form.component.css'],
})
export class FormProjectComponent implements OnInit {
  private readonly destroyRef = inject(DestroyRef);
  private readonly projectsFacade = inject(ProjectsFacade);
  private readonly subsidiesService = inject(SubsidiesService);
  private readonly generalService = inject(GeneralService);

  @Input() itemId!: number;
  @Output() sendFormProject = new EventEmitter<{
    itemId: number;
    formData: FormData;
  }>();

  formProject = new FormGroup(
    {
      title: new FormControl('', [Validators.required]),
      year: new FormControl<number | null>(null, [
        Validators.required,
        Validators.min(2000),
      ]),
      description: new FormControl('', [Validators.maxLength(2000)]),
      subsidy_id: new FormControl<number | null>({
        value: null,
        disabled: true,
      }),
      img: new FormControl(''),
      activities: new FormArray([]),
    },
    { validators: dateRangeValidator }
  );

  selectedImageFile: File | null = null;
  imageSrc = '';
  errorSession = false;
  submitted = false;
  titleForm = 'Registrar proyecto';
  buttonAction = 'Guardar';
  typeList = TypeList.Projects;
  years: number[] = [];
  subsidies: SubsidyModelFullData[] = [];
  currentYear = this.generalService.currentYear;

  ngOnInit(): void {
    this.years = this.generalService.loadYears(this.currentYear, 2018);

    this.formProject.controls.year.valueChanges
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        tap((year) => {
          const subsidyControl = this.formProject.controls.subsidy_id;
          if (typeof year === 'number' && year >= 2000) {
            this.loadSubisidiesByYear(year).subscribe(() => {
              subsidyControl.enable(); // No hagas if (disabled), solo habilitalo
            });
          } else {
            subsidyControl.disable();
          }
        })
      )
      .subscribe();

    if (this.itemId) {
      this.projectsFacade.loadProjectById(this.itemId);
      this.projectsFacade.selectedProject$
        .pipe(
          takeUntilDestroyed(this.destroyRef),
          filter(
            (event: ProjectModel | null): event is ProjectModel => !!event
          ),
          tap((project: ProjectModel) => {
            this.formProject.patchValue({
              title: project.title,
              year: project.year,
              description: project.description,
              subsidy_id: project.subsidy_id,
              img: project.img,
            });
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
          })
        )
        .subscribe();
    }
  }
  setActivities(activities: any[]): void {
    this.activities.clear();
    activities.forEach((act) => this.addActivity(act));
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

    const formData = this.generalService.createFormData(
      rawValues,
      {
        img: this.selectedImageFile,
      },
      this.itemId
    );

    this.sendFormProject.emit({
      itemId: this.itemId,
      formData: formData,
    });
  }
}
