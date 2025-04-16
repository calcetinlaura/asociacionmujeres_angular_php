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
import { EditorModule } from '@tinymce/tinymce-angular';
import { filter, Observable, tap } from 'rxjs';
import { ProjectsFacade } from 'src/app/application/projects.facade';
import { ProjectModel } from 'src/app/core/interfaces/project.interface';
import { SubsidyModel } from 'src/app/core/interfaces/subsidy.interface';
import { TypeList } from 'src/app/core/models/general.model';
import { SubsidiesService } from 'src/app/core/services/subsidies.services';
import { ImageControlComponent } from 'src/app/modules/dashboard/components/image-control/image-control.component';
import { GeneralService } from 'src/app/shared/services/generalService.service';
import { dateRangeValidator } from 'src/app/shared/utils/validators.utils';

@Component({
  selector: 'app-form-project',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    EditorModule,
    MatCardModule,
    ImageControlComponent,
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
  subsidies: SubsidyModel[] = [];
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

  loadSubisidiesByYear(year: number): Observable<SubsidyModel[]> {
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

    const formData = this.generalService.createFormData(
      this.formProject.value,
      this.selectedImageFile,
      this.itemId
    );

    this.sendFormProject.emit({
      itemId: this.itemId,
      formData: formData,
    });
  }
}
