import { CommonModule } from '@angular/common';
import {
  Component,
  DestroyRef,
  EventEmitter,
  inject,
  Input,
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
import { QuillModule } from 'ngx-quill';
import { filter, tap } from 'rxjs';

import townsData from 'data/towns.json';
import { AgentsFacade } from 'src/app/application/agents.facade';
import {
  AgentModel,
  CategoryFilterAgents,
} from 'src/app/core/interfaces/agent.interface';
import { TypeList } from 'src/app/core/models/general.model';
import { GeneralService } from 'src/app/core/services/generalService.service';
import { ImageControlComponent } from 'src/app/shared/components/image-control/image-control.component';
import { SpinnerLoadingComponent } from 'src/app/shared/components/spinner-loading/spinner-loading.component';
import { ScrollToFirstErrorDirective } from 'src/app/shared/directives/scroll-to-first-error.directive';

@Component({
  selector: 'app-form-agent',
  imports: [
    CommonModule,
    ReactiveFormsModule,
    ImageControlComponent,
    MatCardModule,
    QuillModule,
    SpinnerLoadingComponent,
    ScrollToFirstErrorDirective,
  ],
  templateUrl: './form-agent.component.html',
  styleUrls: ['./../../../../../../shared/components/form/form.component.css'],
})
export class FormAgentComponent {
  readonly agentsFacade = inject(AgentsFacade);
  private readonly destroyRef = inject(DestroyRef);
  private readonly generalService = inject(GeneralService);

  @Input() itemId!: number;
  @Input() item: AgentModel | null = null;
  @Output() submitForm = new EventEmitter<{
    itemId: number;
    formData: FormData;
  }>();

  formAgent = new FormGroup({
    name: new FormControl('', [Validators.required]),
    contact: new FormControl(''),
    phone: new FormControl('', [
      Validators.pattern(/^\s*(\+?\d[\d\s\-().]{6,14}\d)\s*$/),
    ]),
    email: new FormControl('', [Validators.email]),
    province: new FormControl(''),
    town: new FormControl(''),
    address: new FormControl(''),
    post_code: new FormControl('', [
      Validators.pattern(/^(?:0[1-9]|[1-4][0-9]|5[0-2])[0-9]{3}$/),
    ]),
    category: new FormControl(''),
    observations: new FormControl('', [Validators.maxLength(300)]),
    img: new FormControl(''),
  });

  selectedImageFile: File | null = null;
  imageSrc = '';
  submitted = false;
  titleForm = 'Registrar agente colaborador';
  buttonAction = 'Guardar';
  CategoryFilterAgents = CategoryFilterAgents;
  typeList = TypeList.Agents;
  provincias: {
    label: string;
    code: string;
    towns: { label: string; code: string }[];
  }[] = [];
  municipios: { label: string; code: string }[] = [];

  quillModules = this.generalService.defaultQuillModules;

  ngOnInit(): void {
    this.provincias = townsData
      .flatMap((region) => region.provinces)
      .sort((a, b) => a.label.localeCompare(b.label));

    // ✅ Caso 1: si el item completo ya llega desde la modal
    if (this.item) {
      this.patchForm(this.item);
      return;
    }

    // ✅ Caso 2: si solo tenemos el id
    if (this.itemId) {
      this.agentsFacade.loadAgentById(this.itemId);
      this.agentsFacade.selectedAgent$
        .pipe(
          takeUntilDestroyed(this.destroyRef),
          filter((agent: AgentModel | null) => agent !== null),
          tap((agent: AgentModel | null) => {
            if (agent) {
              this.patchForm(agent);
            }
          })
        )
        .subscribe();
    }
  }

  private patchForm(agent: AgentModel) {
    // 🔹 Carga de municipios según provincia
    const province = this.provincias.find((p) => p.label === agent.province);
    this.municipios = province?.towns ?? [];

    this.formAgent.patchValue(agent);

    this.titleForm = 'Editar agente colaborador';
    this.buttonAction = 'Guardar cambios';

    if (agent.img) {
      this.imageSrc = agent.img;
      this.selectedImageFile = null;
    }
  }

  onProvinceChange(): void {
    const selectedProvince = this.formAgent.value.province;
    const province = this.provincias.find((p) => p.label === selectedProvince);
    this.municipios = province?.towns ?? [];
    this.formAgent.patchValue({ town: '' });
  }

  async onImageSelected(file: File) {
    const result = await this.generalService.handleFileSelection(file);
    this.selectedImageFile = result.file;
    this.imageSrc = result.imageSrc;
  }

  onSendFormAgent(): void {
    if (this.formAgent.invalid) {
      this.submitted = true;
      console.log('Formulario inválido', this.formAgent.errors);
      return;
    }

    const rawValues = { ...this.formAgent.getRawValue() } as any;

    if (rawValues.observations) {
      rawValues.observations = rawValues.observations.replace(/&nbsp;/g, ' ');
    }

    const formData = this.generalService.createFormData(
      rawValues,
      { img: this.selectedImageFile },
      this.itemId
    );

    this.submitForm.emit({ itemId: this.itemId, formData });
  }

  observationsLen(): number {
    return (this.formAgent.get('observations')?.value || '').length;
  }
}
