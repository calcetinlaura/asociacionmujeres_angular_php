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
import { filter, tap } from 'rxjs';
import { AgentsFacade } from 'src/app/application/agents.facade';
import {
  AgentModel,
  categoryFilterAgents,
} from 'src/app/core/interfaces/agent.interface';
import { TypeList } from 'src/app/core/models/general.model';
import { GeneralService } from 'src/app/shared/services/generalService.service';
import { ImageControlComponent } from '../../../../components/image-control/image-control.component';
@Component({
    selector: 'app-form-agent',
    imports: [
        CommonModule,
        ReactiveFormsModule,
        ImageControlComponent,
        MatCardModule,
    ],
    templateUrl: './form-agent.component.html',
    styleUrls: ['../../../../components/form/form.component.css']
})
export class FormAgentComponent {
  private agentsFacade = inject(AgentsFacade);
  private destroyRef = inject(DestroyRef);
  private generalService = inject(GeneralService);

  @Input() itemId!: number;
  @Output() sendFormAgent = new EventEmitter<{
    itemId: number;
    formData: FormData;
  }>();
  selectedImageFile: File | null = null;
  agentData: any;
  imageSrc: string = '';
  errorSession = false;
  submitted = false;
  titleForm: string = 'Registrar acreedor/a';
  buttonAction: string = 'Guardar';
  categoryFilterAgents = categoryFilterAgents;
  typeList = TypeList.Agents;
  formAgent = new FormGroup({
    name: new FormControl('', [Validators.required]),
    contact: new FormControl(''),
    phone: new FormControl(''),
    email: new FormControl(''),
    province: new FormControl(''),
    town: new FormControl(''),
    address: new FormControl(''),
    post_code: new FormControl(''),
    category: new FormControl(''),
    observations: new FormControl(''),
    img: new FormControl(''),
  });
  provincias: {
    label: string;
    code: string;
    towns: { label: string; code: string }[];
  }[] = [];
  municipios: { label: string; code: string }[] = [];

  ngOnInit(): void {
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
          })
        )
        .subscribe();
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

    const formData = this.generalService.createFormData(
      rawValues,
      {
        img: this.selectedImageFile,
      },
      this.itemId
    );

    this.sendFormAgent.emit({ itemId: this.itemId, formData: formData });
  }
}
