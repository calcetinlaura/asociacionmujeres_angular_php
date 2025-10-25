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

import townsData from 'data/towns.json';
import { QuillModule } from 'ngx-quill';
import { filter, tap } from 'rxjs';
import { AgentsFacade } from 'src/app/application/agents.facade';
import {
  AgentModel,
  CategoryFilterAgents,
} from 'src/app/core/interfaces/agent.interface';
import { TypeList } from 'src/app/core/models/general.model';
import { ImageControlComponent } from 'src/app/shared/components/image-control/image-control.component';
import { SpinnerLoadingComponent } from 'src/app/shared/components/spinner-loading/spinner-loading.component';
import { ScrollToFirstErrorDirective } from 'src/app/shared/directives/scroll-to-first-error.directive';
import { GeneralService } from 'src/app/shared/services/generalService.service';

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
  private agentsFacade = inject(AgentsFacade);
  private destroyRef = inject(DestroyRef);
  private generalService = inject(GeneralService);

  @Input() itemId!: number;
  @Output() submitForm = new EventEmitter<{
    itemId: number;
    formData: FormData;
  }>();
  selectedImageFile: File | null = null;
  agentData: any;
  imageSrc: string = '';
  submitted = false;
  titleForm: string = 'Registrar agente colaborador';
  buttonAction: string = 'Guardar';
  CategoryFilterAgents = CategoryFilterAgents;
  typeList = TypeList.Agents;
  formAgent = new FormGroup({
    name: new FormControl('', [Validators.required]),
    contact: new FormControl(''),
    phone: new FormControl('', [
      // Permite vacío; si hay valor, debe cumplir el patrón
      Validators.pattern(/^\s*(\+?\d[\d\s\-().]{6,14}\d)\s*$/),
    ]),
    email: new FormControl('', [
      // Permite vacío; si hay valor, debe ser email válido
      Validators.email,
    ]),
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
    this.isLoading = true;
    this.provincias = townsData
      .flatMap((region) => region.provinces)
      .sort((a, b) => a.label.localeCompare(b.label));
    if (this.itemId) {
      this.agentsFacade.loadAgentById(this.itemId);
      this.agentsFacade.selectedAgent$
        .pipe(
          takeUntilDestroyed(this.destroyRef),
          filter((agent: AgentModel | null) => agent !== null),
          tap((agent: AgentModel | null) => {
            if (agent) {
              // 🔹 Primero actualizamos los municipios basándonos en la provincia recibida
              const province = this.provincias.find(
                (p) => p.label === agent.province
              );
              this.municipios = province?.towns ?? [];

              // 🔹 Luego seteamos los valores del formulario
              this.formAgent.patchValue(agent);

              this.titleForm = 'Editar Acreedor/a';
              this.buttonAction = 'Guardar cambios';
              if (agent.img) {
                this.imageSrc = agent.img;
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

  onProvinceChange(): void {
    const selectedProvince = this.formAgent.value.province;
    const province = this.provincias.find((p) => p.label === selectedProvince);
    this.municipios = province?.towns ?? [];
    this.formAgent.patchValue({ town: '' }); // limpia el municipio
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

    this.submitForm.emit({ itemId: this.itemId, formData: formData });
  }
  observationsLen(): number {
    return (this.formAgent.get('observations')?.value || '').length;
  }
}
