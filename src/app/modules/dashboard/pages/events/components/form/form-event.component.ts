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
import {
  FormArray,
  FormControl,
  FormGroup,
  ReactiveFormsModule,
  Validators,
} from '@angular/forms';
import { MatCardModule } from '@angular/material/card';

import townsData from 'data/towns.json';
import { filter, forkJoin, map, Observable, switchMap, tap } from 'rxjs';
import { EventsFacade } from 'src/app/application/events.facade';
import { AgentModel } from 'src/app/core/interfaces/agent.interface';
import {
  EnumStatusEvent,
  EventModelFullData,
  statusEvent,
} from 'src/app/core/interfaces/event.interface';
import { PlaceModel } from 'src/app/core/interfaces/place.interface';
import { TypeList } from 'src/app/core/models/general.model';
import { AgentsService } from 'src/app/core/services/agents.services';
import { ImageControlComponent } from 'src/app/modules/dashboard/components/image-control/image-control.component';
import { GeneralService } from 'src/app/shared/services/generalService.service';
import { ButtonIconComponent } from '../../../../../../shared/components/buttons/button-icon/button-icon.component';
import { AgentArrayControlComponent } from '../array-agents/array-agents.component';
// Importaciones...
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { PlacesFacade } from 'src/app/application/places.facade';
import { MacroeventModel } from 'src/app/core/interfaces/macroevent.interface';
import { SalaModel } from 'src/app/core/interfaces/place.interface'; // Asegúrate de tener este modelo
import { ProjectModel } from 'src/app/core/interfaces/project.interface';
import { MacroeventsService } from 'src/app/core/services/macroevents.services';
import { ProjectsService } from 'src/app/core/services/projects.services';
import { dateRangeValidator } from 'src/app/shared/utils/validators.utils';

@Component({
    selector: 'app-form-event',
    imports: [
        CommonModule,
        ReactiveFormsModule,
        MatCardModule,
        ImageControlComponent,
        ButtonIconComponent,
        AgentArrayControlComponent,
    ],
    templateUrl: './form-event.component.html',
    styleUrls: ['../../../../components/form/form.component.css']
})
export class FormEventComponent implements OnInit, OnChanges {
  private readonly destroyRef = inject(DestroyRef);
  private readonly eventsFacade = inject(EventsFacade);
  private readonly placesFacade = inject(PlacesFacade);
  private readonly macroeventsService = inject(MacroeventsService);
  private readonly projectsService = inject(ProjectsService);
  private readonly agentsService = inject(AgentsService);
  private readonly generalService = inject(GeneralService);
  @Input() item!: EventModelFullData | null;
  @Input() itemId!: number;
  @Output() sendFormEvent = new EventEmitter<{
    itemId: number;
    formData: FormData;
  }>();

  selectedImageFile: File | null = null;
  imageSrc = '';
  errorSession = false;
  submitted = false;
  titleForm: string = 'Registrar evento';
  buttonAction: string = 'Guardar';
  typeList = TypeList.Events;
  statusEvent = statusEvent;
  enumStatusEnum = EnumStatusEvent;
  showOrganizers = false;
  showCollaborators = false;
  showSponsors = false;

  formEvent = new FormGroup(
    {
      title: new FormControl('', [Validators.required]),
      start: new FormControl('', [Validators.required]),
      end: new FormControl('', [Validators.required]),
      time: new FormControl(''),
      description: new FormControl('', [Validators.maxLength(2000)]),
      province: new FormControl(''),
      town: new FormControl(''),
      place_id: new FormControl<number | null>(null),
      sala_id: new FormControl<number | null>(null),
      capacity: new FormControl(),
      price: new FormControl(''),
      img: new FormControl(''),
      status: new FormControl(EnumStatusEvent.EJECUCION),
      status_reason: new FormControl(''),
      inscription: new FormControl(false),
      organizer: new FormArray([]),
      collaborator: new FormArray([]),
      sponsor: new FormArray([]),
      macroevent_id: new FormControl<number | null>({
        value: null,
        disabled: true,
      }),
      project_id: new FormControl<number | null>({
        value: null,
        disabled: true,
      }),
    },
    { validators: dateRangeValidator }
  );
  macroevents: MacroeventModel[] = [];
  projects: ProjectModel[] = [];
  provincias: {
    label: string;
    code: string;
    towns: { label: string; code: string }[];
  }[] = [];
  municipios: { label: string; code: string }[] = [];
  espacios: PlaceModel[] = [];
  salasDelLugar: SalaModel[] = []; // ← NUEVO
  agents: AgentModel[] = [];
  selectedPlaceId: number | null = null;
  isCreate = false;

  ngOnInit(): void {
    this.provincias = townsData
      .flatMap((region) => region.provinces)
      .sort((a, b) => a.label.localeCompare(b.label));

    this.agentsService
      .getAgents()
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        tap((data) => (this.agents = data))
      )
      .subscribe();
    this.formEvent
      .get('status')
      ?.valueChanges.pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((status) => {
        if (status === EnumStatusEvent.EJECUCION) {
          this.formEvent.get('status_reason')?.disable();
        } else {
          this.formEvent.get('status_reason')?.enable();
        }
      });
    // 👇 Aquí vuelves a escuchar cambios de fecha
    this.formEvent
      .get('start')
      ?.valueChanges.pipe(
        takeUntilDestroyed(this.destroyRef),
        tap((start: string | null) => {
          if (start) {
            const year = this.generalService.getYearFromDate(start);
            this.loadYearlyData(year).subscribe();
            this.generalService.enableInputControls(this.formEvent, [
              'project_id',
              'macroevent_id',
            ]);
          } else {
            this.generalService.disableInputControls(this.formEvent, [
              'project_id',
              'macroevent_id',
            ]);
          }
        })
      )
      .subscribe();
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (
      changes['itemId'] &&
      changes['itemId'].currentValue !== changes['itemId'].previousValue
    ) {
      const newId = changes['itemId'].currentValue;

      if (newId) {
        this.eventsFacade.loadEventById(newId);

        this.eventsFacade.selectedEvent$
          .pipe(
            takeUntilDestroyed(this.destroyRef),
            filter(
              (event): event is EventModelFullData =>
                !!event && event.id === newId
            ),
            tap(() => this.formEvent.reset()), // 👈 para evitar parches sobre datos viejos
            switchMap((event) => this.populateFormWithEvent(event))
          )
          .subscribe();
      }
    }

    // 👇 Manejo cuando es duplicar o crear (ya tienes la data directamente)
    if (changes['item'] && changes['item'].currentValue && this.itemId === 0) {
      this.formEvent.reset(); // ← importante para que no se mezclen restos
      this.populateFormWithEvent(this.item!).subscribe();
    }
  }

  private populateFormWithEvent(event: EventModelFullData): Observable<void> {
    this.organizers.clear();
    this.collaborators.clear();
    this.sponsors.clear();

    const year = this.generalService.getYearFromDate(event.start);

    return this.loadYearlyData(year).pipe(
      // switchMap(() => this.loadMacroeventosByYear(year)),
      tap(() => {
        const province = this.provincias.find(
          (p) => p.label === event.province
        );
        this.municipios = province?.towns ?? [];

        this.formEvent.patchValue(
          {
            title: event.title,
            start: event.start,
            end: event.end,
            time: event.time,
            description: event.description,
            province: event.province,
            town: event.town,
            place_id: event.place_id,
            sala_id: event.sala_id,
            capacity: event.capacity ?? null,
            price: event.price,
            img: event.img,
            status: event.status,
            status_reason: event.status_reason,
            inscription: event.inscription ?? false,
            macroevent_id: event.macroevent_id,
            project_id: event.project_id,
          },
          { emitEvent: false }
        );
        this.generalService.enableInputControls(this.formEvent, [
          'project_id',
          'macroevent_id',
        ]);
        if (event.place_id) {
          this.placesFacade
            .loadSalasForPlace(event.place_id, event.sala_id)
            .pipe(
              takeUntilDestroyed(this.destroyRef),
              tap(({ salas, selectedSala }) => {
                this.salasDelLugar = salas;
                this.formEvent.patchValue({
                  sala_id: selectedSala?.sala_id ?? null,
                  capacity: selectedSala?.capacity ?? null,
                });
              })
            )
            .subscribe();
        }

        if (event.organizer && event.organizer.length > 0) {
          console.log(
            'Organizadores desde el backend:',
            event.organizer.length
          );
          this.showOrganizers = true;
          event.organizer.forEach((agent) =>
            this.organizers.push(this.createAgentForm(agent.id))
          );
        }

        if (event.collaborator && event.collaborator.length > 0) {
          console.log(
            'Colaboradores desde el backend:',
            event.collaborator.length
          );
          this.showCollaborators = true;
          event.collaborator.forEach((agent) =>
            this.collaborators.push(this.createAgentForm(agent.id))
          );
        }

        if (event.sponsor && event.sponsor.length > 0) {
          console.log('Patrocinadores desde el backend:', event.sponsor.length);
          this.showSponsors = true;
          event.sponsor.forEach((agent) =>
            this.sponsors.push(this.createAgentForm(agent.id))
          );
        }

        this.onTownChange();
        this.titleForm =
          this.itemId === 0 ? 'Duplicar evento' : 'Editar Evento';
        this.buttonAction = this.itemId === 0 ? 'Duplicar' : 'Guardar cambios';

        if (event.img) {
          this.imageSrc = event.img;
          this.selectedImageFile = null;
        }
      }),
      map(() => void 0) // 👈 Aquí está la conversión a Observable<void>
    );
  }
  private loadYearlyData(year: number): Observable<void> {
    // 🔁 Siempre cargar, aunque sea el mismo año
    return forkJoin([
      this.loadProjectsByYear(year),
      this.loadMacroeventosByYear(year),
    ]).pipe(map(() => void 0));
  }

  loadMacroeventosByYear(year: number): Observable<MacroeventModel[]> {
    return this.macroeventsService.getMacroeventsByYear(year).pipe(
      tap((macroevents) => {
        this.macroevents = macroevents;
      })
    );
  }

  loadProjectsByYear(year: number): Observable<ProjectModel[]> {
    return this.projectsService.getProjectsByYear(year).pipe(
      tap((projects) => {
        this.projects = projects;
      })
    );
  }

  onProvinceChange(): void {
    const selectedProvince = this.formEvent.value.province;
    const province = this.provincias.find((p) => p.label === selectedProvince);
    this.municipios = province?.towns ?? [];
    this.formEvent.patchValue({ town: '' });
  }

  onTownChange(): void {
    const selectedTown = this.formEvent.value.town;
    if (selectedTown) {
      this.placesFacade
        .loadPlacesByTown(selectedTown)
        .pipe(
          takeUntilDestroyed(this.destroyRef),
          tap((places: PlaceModel[]) => {
            this.espacios = [...places].sort((a, b) =>
              a.name.localeCompare(b.name)
            );
          })
        )
        .subscribe();
    } else {
      this.espacios = [];
    }
  }

  onPlaceChange(): void {
    const placeId = this.formEvent.value.place_id;

    if (placeId) {
      this.placesFacade
        .loadSalasForPlace(placeId)
        .pipe(
          takeUntilDestroyed(this.destroyRef),
          tap(({ salas }) => {
            this.salasDelLugar = [...salas].sort((a, b) =>
              a.name.localeCompare(b.name)
            );
            this.formEvent.patchValue({ sala_id: null, capacity: null });
          })
        )
        .subscribe();
    } else {
      this.salasDelLugar = [];
      this.formEvent.patchValue({ sala_id: null, capacity: null });
    }
  }

  onSalaChange(): void {
    const salaId = this.formEvent.value.sala_id;
    const placeId = this.formEvent.value.place_id;

    const matchingSala = this.salasDelLugar.find(
      (s) => s.place_id === placeId && s.sala_id === salaId
    );

    if (matchingSala) {
      this.formEvent.patchValue({
        sala_id: matchingSala.sala_id,
        capacity: matchingSala.capacity ?? null,
      });
    }
  }

  get organizers(): FormArray {
    return this.formEvent.get('organizer') as FormArray;
  }

  get collaborators(): FormArray {
    return this.formEvent.get('collaborator') as FormArray;
  }

  get sponsors(): FormArray {
    return this.formEvent.get('sponsor') as FormArray;
  }

  createAgentForm(agent_id: number | null = null): FormGroup {
    return new FormGroup({
      agent_id: new FormControl(agent_id, Validators.required),
    });
  }

  addOrganizer(): void {
    this.showOrganizers = true;
    this.organizers.push(this.createAgentForm(null));
  }

  addCollaborator(): void {
    this.showCollaborators = true;
    this.collaborators.push(this.createAgentForm(null));
  }

  addSponsor(): void {
    this.showSponsors = true;
    this.sponsors.push(this.createAgentForm(null));
  }

  removeOrganizer(index: number): void {
    this.organizers.removeAt(index);
    if (this.organizers.length === 0) this.showOrganizers = false;
  }

  removeCollaborator(index: number): void {
    this.collaborators.removeAt(index);
    if (this.collaborators.length === 0) this.showCollaborators = false;
  }

  removeSponsor(index: number): void {
    this.sponsors.removeAt(index);
    if (this.sponsors.length === 0) this.showSponsors = false;
  }

  async onImageSelected(file: File | null) {
    if (!file) {
      this.selectedImageFile = null;
      this.imageSrc = '';
      this.formEvent.get('img')?.setValue(null); // 🔁 importante para resetear el valor
      return;
    }

    const result = await this.generalService.handleFileSelection(file);
    this.selectedImageFile = result.file;
    this.imageSrc = result.imageSrc;
  }

  onSendFormEvent(): void {
    this.submitted = true;

    if (this.formEvent.invalid) {
      console.log('Formulario inválido', this.formEvent.errors);
      return;
    }

    const value = this.formEvent.value;

    const organizerIds = this.organizers
      .getRawValue()
      .map((a: any) => a.agent_id);
    const collaboratorIds = this.collaborators
      .getRawValue()
      .map((a: any) => a.agent_id);
    const sponsorIds = this.sponsors.getRawValue().map((a: any) => a.agent_id);

    const dataToSend = {
      ...value,
      macroevent_id: value.macroevent_id ? Number(value.macroevent_id) : null,
      project_id: value.project_id ? Number(value.project_id) : null,
      place_id: value.place_id ? Number(value.place_id) : null,
      sala_id: value.sala_id ? Number(value.sala_id) : null,
      organizer: JSON.stringify(organizerIds),
      collaborator: JSON.stringify(collaboratorIds),
      sponsor: JSON.stringify(sponsorIds),
    };

    const formData = this.generalService.createFormData(
      dataToSend,
      {
        img: this.selectedImageFile,
      },
      this.itemId
    );

    this.sendFormEvent.emit({ itemId: this.itemId, formData: formData });
  }
}
