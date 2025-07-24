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
  FormBuilder,
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
  DayEventModel,
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
import { QuillModule } from 'ngx-quill';
import { PlacesFacade } from 'src/app/application/places.facade';
import { MacroeventModel } from 'src/app/core/interfaces/macroevent.interface';
import { SalaModel } from 'src/app/core/interfaces/place.interface'; // Asegúrate de tener este modelo
import { ProjectModel } from 'src/app/core/interfaces/project.interface';
import { MacroeventsService } from 'src/app/core/services/macroevents.services';
import { ProjectsService } from 'src/app/core/services/projects.services';
import { ButtonSelectComponent } from 'src/app/shared/components/buttons/button-select/button-select.component';
import {
  dateRangeValidator,
  timeRangeValidator,
  uniqueStartDatesValidator,
} from 'src/app/shared/utils/validators.utils';
import { DateArrayControlComponent } from '../array-dates/array-dates.component';
@Component({
  selector: 'app-form-event',
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatCardModule,
    ImageControlComponent,
    ButtonIconComponent,
    AgentArrayControlComponent,
    QuillModule,
    ButtonSelectComponent,
    DateArrayControlComponent,
  ],
  templateUrl: './form-event.component.html',
  styleUrls: ['../../../../components/form/form.component.css'],
})
export class FormEventComponent implements OnInit, OnChanges {
  private readonly destroyRef = inject(DestroyRef);
  private readonly eventsFacade = inject(EventsFacade);
  private readonly placesFacade = inject(PlacesFacade);
  private readonly macroeventsService = inject(MacroeventsService);
  private readonly projectsService = inject(ProjectsService);
  private readonly agentsService = inject(AgentsService);
  private readonly generalService = inject(GeneralService);
  private readonly fb = inject(FormBuilder);

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
  isPeriodicEvent = false;
  eventTypeMacro: 'event' | 'macro' = 'event';
  eventTypeProject: 'event' | 'project' = 'event';
  eventTypePeriod: 'event' | 'single' | 'periodic' = 'event';
  eventTypeUbication: 'place' | 'online' | 'pending' = 'pending';
  eventTypeAccess: 'free' | 'tickets' = 'free';
  eventTypeStatus: 'event' | 'cancel' | 'postpone' | 'sold_out' = 'event';
  eventTypeInscription: 'unlimited' | 'inscription' = 'unlimited';

  formEvent = new FormGroup(
    {
      title: new FormControl('', [Validators.required]),
      start: new FormControl('', [Validators.required]),
      end: new FormControl(''),
      time_start: new FormControl(''),
      time_end: new FormControl(''),
      description: new FormControl('', [Validators.maxLength(2000)]),
      online_link: new FormControl(''),
      province: new FormControl(''),
      town: new FormControl(''),
      place_id: new FormControl<number | null>(null),
      sala_id: new FormControl<number | null>(null),
      capacity: new FormControl(),
      ticket_prices: new FormArray<FormGroup>([]),
      tickets_method: new FormControl(''),
      periodic: new FormControl(false),
      periodic_id: new FormControl(''),
      repeated_dates: new FormArray<FormGroup>([], {
        validators: [uniqueStartDatesValidator],
      }),
      img: new FormControl(''),
      status: new FormControl(EnumStatusEvent.EJECUCION),
      status_reason: new FormControl(''),
      inscription: new FormControl(false),
      inscription_method: new FormControl(''),
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
    { validators: [dateRangeValidator, timeRangeValidator] }
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
  dates: DayEventModel[] = [];
  wasPeriodic = false;
  selectedPlaceId: number | null = null;
  isCreate = false;
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
    this.wasPeriodic = false;
    this.submitted = false;
    this.organizers.clear();
    this.collaborators.clear();
    this.sponsors.clear();

    const year = this.generalService.getYearFromDate(event.start);

    return this.loadYearlyData(year).pipe(
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
            time_start: event.time_start,
            time_end: event.time_end,
            description: event.description,
            province: event.province,
            town: event.town,
            place_id: event.place_id,
            sala_id: event.sala_id,
            capacity: event.capacity ?? null,
            img: event.img,
            status: event.status,
            status_reason: event.status_reason,
            inscription: event.inscription ?? false,
            inscription_method: event.inscription_method,
            tickets_method: event.tickets_method,
            macroevent_id: event.macroevent_id,
            project_id: event.project_id,
            online_link: event.online_link ?? '',
            periodic_id: event.periodic_id ?? '',
          },
          { emitEvent: false }
        );

        this.eventTypePeriod = event.periodic ? 'periodic' : 'single';

        if (event.place_id) {
          this.eventTypeUbication = 'place';
        } else if (event.online_link) {
          this.eventTypeUbication = 'online';
        } else {
          this.eventTypeUbication = 'pending';
        }

        let parsedTicketPrices: any[] = [];
        try {
          parsedTicketPrices =
            typeof event.ticket_prices === 'string'
              ? JSON.parse(event.ticket_prices)
              : event.ticket_prices;
        } catch (e) {
          console.warn('No se pudo parsear ticket_prices:', e);
          parsedTicketPrices = [];
        }

        if (
          Array.isArray(parsedTicketPrices) &&
          parsedTicketPrices.length > 0
        ) {
          this.eventTypeAccess = 'tickets';
        } else {
          this.eventTypeAccess = 'free';
        }

        this.ticketPrices.clear();
        parsedTicketPrices.forEach((ticket) => {
          this.ticketPrices.push(
            this.createTicketPriceForm(ticket.type, ticket.price)
          );
        });

        this.eventTypeInscription = event.inscription
          ? 'inscription'
          : 'unlimited';

        switch (event.status) {
          case EnumStatusEvent.EJECUCION:
            this.eventTypeStatus = 'event';
            break;
          case EnumStatusEvent.CANCELADO:
            this.eventTypeStatus = 'cancel';
            break;
          case EnumStatusEvent.APLAZADO:
            this.eventTypeStatus = 'postpone';
            break;
          case EnumStatusEvent.AGOTADO:
            this.eventTypeStatus = 'sold_out';
            break;
          default:
            this.eventTypeStatus = 'event';
            break;
        }

        this.generalService.enableInputControls(this.formEvent, [
          'project_id',
          'macroevent_id',
        ]);
        if (event.periodic_id) {
          this.isPeriodicEvent = true;
          this.eventTypePeriod = 'periodic';
          this.wasPeriodic = true;

          // Limpia los repeated_dates previos:
          this.repeatedDates.clear();

          // Aquí deberías cargar **TODOS los eventos con ese periodic_id**
          this.eventsFacade
            .loadEventsByPeriodicId(event.periodic_id)
            .pipe(
              takeUntilDestroyed(this.destroyRef),
              tap((events) => {
                this.repeatedDates.clear();

                // Aquí ordenamos antes de cargar en el FormArray:
                const sortedEvents = [...events].sort((a, b) =>
                  a.start.localeCompare(b.start)
                );

                sortedEvents.forEach((e) => {
                  this.repeatedDates.push(
                    this.fb.group({
                      id: [e.id],
                      start: [e.start, Validators.required],
                      end: [e.end],
                      time_start: [e.time_start],
                      time_end: [e.time_end],
                    })
                  );
                });
              })
            )
            .subscribe();
        } else {
          this.isPeriodicEvent = false;
          this.eventTypePeriod = 'single';
        }

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
          this.showOrganizers = true;
          event.organizer.forEach((agent) =>
            this.organizers.push(this.createAgentForm(agent.id))
          );
        }

        if (event.collaborator && event.collaborator.length > 0) {
          this.showCollaborators = true;
          event.collaborator.forEach((agent) =>
            this.collaborators.push(this.createAgentForm(agent.id))
          );
        }

        if (event.sponsor && event.sponsor.length > 0) {
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
      map(() => void 0)
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
  get isTypePeriodSelected(): boolean {
    return (
      this.eventTypePeriod === 'single' || this.eventTypePeriod === 'periodic'
    );
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

  setEventTypePeriod(type: 'event' | 'single' | 'periodic'): void {
    this.eventTypePeriod = type;

    const startControl = this.formEvent.get('start');

    if (type === 'single') {
      this.isPeriodicEvent = false;
      if (this.wasPeriodic) {
        this.formEvent.patchValue({
          start: null,
          end: null,
          time_start: null,
          time_end: null,
        });
      }
      this.repeatedDates.clear();
      startControl?.setValidators([Validators.required]);
      startControl?.updateValueAndValidity();
    } else if (type === 'periodic') {
      this.isPeriodicEvent = true;
      this.wasPeriodic = true;
      this.formEvent.patchValue({
        start: null,
        end: null,
        time_start: null,
        time_end: null,
      });

      startControl?.clearValidators();
      startControl?.updateValueAndValidity();

      if (this.repeatedDates.length === 0) {
        this.addRepeatedDate();
      }
    }
  }

  setEventTypeUbication(type: 'place' | 'online' | 'pending'): void {
    this.eventTypeUbication = type;
    const onlineLinkControl = this.formEvent.get('online_link');

    if (type === 'online') {
      // Limpiar campos de ubicación si selecciona online
      this.formEvent.patchValue({
        province: '',
        town: '',
        place_id: null,
        sala_id: null,
        capacity: null,
      });

      // Aplicar validadores dinámicos a online_link
      onlineLinkControl?.setValidators([
        Validators.required,
        Validators.pattern(/^https?:\/\/.+$/),
      ]);
    } else {
      // Quitar validadores a online_link y limpiar valor
      onlineLinkControl?.clearValidators();
      onlineLinkControl?.setValue('');
    }
    if (type === 'place') {
    }
    onlineLinkControl?.updateValueAndValidity();
  }
  setEventTypeMacro(type: 'event' | 'macro'): void {
    this.eventTypeMacro = type;

    if (type === 'macro') {
      this.formEvent.patchValue({ macroevent_id: null });
    } else {
      this.formEvent.patchValue({ macroevent_id: null });
    }
  }
  setEventTypeProject(type: 'event' | 'project'): void {
    this.eventTypeProject = type;

    if (type === 'project') {
      this.formEvent.patchValue({ project_id: null });
    } else {
      this.formEvent.patchValue({ project_id: null });
    }
  }
  setEventTypeAccess(type: 'free' | 'tickets'): void {
    this.eventTypeAccess = type;

    if (type === 'tickets') {
      // Asegúrate de que haya al menos una fila:
      if (this.ticketPrices.length === 0) {
        this.addTicketPrice();
      }
      this.formEvent.patchValue({ inscription_method: '' });
    } else {
      // Opcional: si quieres limpiar cuando cambie a otro tipo
      this.ticketPrices.clear();
      this.formEvent.patchValue({ tickets_method: '' });
    }
  }
  setEventTypeInscription(type: 'unlimited' | 'inscription'): void {
    this.eventTypeInscription = type;

    if (type === 'inscription') {
      this.formEvent.patchValue({ inscription: true });
    } else {
      this.formEvent.patchValue({ inscription: false });
    }
  }

  setEventTypeStatus(type: 'event' | 'cancel' | 'postpone' | 'sold_out'): void {
    this.eventTypeStatus = type;

    const statusMap = {
      event: EnumStatusEvent.EJECUCION,
      cancel: EnumStatusEvent.CANCELADO,
      postpone: EnumStatusEvent.APLAZADO,
      sold_out: EnumStatusEvent.AGOTADO,
    };

    const statusReasonRequired = type !== 'event';
    const newStatus = statusMap[type];

    this.formEvent.patchValue({
      status: newStatus,
      status_reason: '',
    });

    const statusReasonControl = this.formEvent.get('status_reason');
    if (statusReasonRequired) {
      statusReasonControl?.enable();
    } else {
      statusReasonControl?.disable();
    }
  }

  get repeatedDates(): FormArray {
    return this.formEvent.get('repeated_dates') as FormArray;
  }

  addRepeatedDate(): void {
    this.repeatedDates.push(
      this.fb.group({
        start: ['', Validators.required],
        end: [''],
        time_start: [''],
        time_end: [''],
      })
    );
  }

  removeRepeatedDate(index: number): void {
    this.repeatedDates.removeAt(index);
  }

  get ticketPrices(): FormArray {
    return this.formEvent.get('ticket_prices') as FormArray;
  }
  createTicketPriceForm(
    type: string = '',
    price: number | null = null
  ): FormGroup {
    return new FormGroup({
      type: new FormControl(type, Validators.required),
      price: new FormControl(price, [Validators.required, Validators.min(0)]),
    });
  }

  addTicketPrice(): void {
    this.ticketPrices.push(this.createTicketPriceForm());
  }

  removeTicketPrice(index: number): void {
    this.ticketPrices.removeAt(index);
  }
  generateUUID(): string {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(
      /[xy]/g,
      function (c) {
        const r = (Math.random() * 16) | 0;
        const v = c === 'x' ? r : (r & 0x3) | 0x8;
        return v.toString(16);
      }
    );
  }
  trackByLabel(index: number, item: any) {
    return item.label;
  }

  trackById(index: number, item: any) {
    return item.id;
  }

  trackBySalaId(index: number, item: any) {
    return item.sala_id;
  }
  onSendFormEvent(): void {
    console.log('📤 Enviando formulario…');
    if (this.formEvent.invalid) {
      this.submitted = true;
      if (this.isPeriodicEvent) {
        const hasAtLeastOneStart = this.repeatedDates.controls.some(
          (fg) => !!fg.get('start')?.value
        );

        if (!hasAtLeastOneStart) {
          console.warn(
            'Debe añadir al menos una fecha válida en repeated_dates'
          );
          return;
        }
      }
      const formGroupErrors = this.formEvent.errors;
      if (formGroupErrors) {
        console.log('Errores a nivel de formulario:', formGroupErrors);
      }

      Object.keys(this.formEvent.controls).forEach((key) => {
        const control = this.formEvent.get(key);
        if (control && control.invalid) {
          console.log(
            `Campo '${key}' inválido. Errors:`,
            control.errors,
            `Valor actual:`,
            control.value
          );
        }
      });

      return;
    }

    const formValues = this.formEvent.getRawValue();

    // ✅ Ajuste de fecha fin si está vacío:
    if (!formValues.end && formValues.start) {
      formValues.end = formValues.start;
    }

    // ✅ Ajuste de time_end si está vacío o es "00:00:00"
    const isTimeEndEmpty =
      !formValues.time_end ||
      formValues.time_end === '00:00' ||
      formValues.time_end === '00:00:00';
    if (isTimeEndEmpty) {
      if (formValues.time_start) {
        formValues.time_end = this.calcTimeEnd(formValues.time_start);
      } else {
        formValues.time_end = '';
      }
    }

    const organizerIds = this.organizers
      .getRawValue()
      .map((a: any) => a.agent_id);
    const collaboratorIds = this.collaborators
      .getRawValue()
      .map((a: any) => a.agent_id);
    const sponsorIds = this.sponsors.getRawValue().map((a: any) => a.agent_id);

    const baseEventData = {
      ...formValues,
      macroevent_id: formValues.macroevent_id
        ? Number(formValues.macroevent_id)
        : null,
      project_id: formValues.project_id ? Number(formValues.project_id) : null,
      organizer: organizerIds,
      collaborator: collaboratorIds,
      sponsor: sponsorIds,
      ticket_prices: this.ticketPrices.getRawValue(),
    };

    if (this.isPeriodicEvent && formValues.repeated_dates.length > 0) {
      const groupId =
        formValues.periodic_id && formValues.periodic_id.trim() !== ''
          ? formValues.periodic_id
          : this.generateUUID();
      this.formEvent.patchValue({ periodic_id: groupId }); // ✅ Importante

      formValues.repeated_dates.forEach((rd: any) => {
        if (!rd.start) {
          return;
        }

        const end = rd.end || rd.start;
        const timeStart = rd.time_start;
        let timeEnd = rd.time_end;
        if (!timeStart) {
          timeEnd = '';
        } else if (!timeEnd || timeEnd === '00:00' || timeEnd === '00:00:00') {
          timeEnd = this.calcTimeEnd(timeStart);
        }

        const eventId = rd.id ?? 0;
        const eventData = {
          ...baseEventData,
          start: rd.start,
          end,
          time_start: rd.time_start,
          time_end: timeEnd,
          periodic_id: groupId,
        };

        const formData = this.generalService.createFormData(
          eventData,
          { img: this.selectedImageFile },
          eventId
        );

        this.sendFormEvent.emit({
          itemId: eventId,
          formData,
        });
      });
    } else if (!this.isPeriodicEvent) {
      const eventData = { ...baseEventData, group_id: null };

      if (eventData.description) {
        eventData.description = eventData.description.replace(/&nbsp;/g, ' ');
      }

      const formData = this.generalService.createFormData(
        eventData,
        { img: this.selectedImageFile },
        this.itemId
      );
      const repeatedDates = formData.get('repeated_dates');
      if (repeatedDates === '[]') {
        formData.set('periodic_id', '');
      }
      // 👇 NUEVO BLOQUE: borrar eventos recurrentes si se pasó de periodic a individual
      const hadPeriodicId = !!this.item?.periodic_id;
      const oldPeriodicId = this.item?.periodic_id;
      const newPeriodicId = formData.get('periodic_id');
      if (hadPeriodicId && (!newPeriodicId || newPeriodicId === '')) {
        // ⏳ Guardar como evento único
        this.eventsFacade
          .editEvent(this.itemId, formData) // Este método debe devolver un Observable
          .pipe(takeUntilDestroyed(this.destroyRef))
          .subscribe({
            next: () => {
              // ✅ Después de guardar, eliminamos el resto del grupo
              this.eventsFacade
                .deleteEventsByPeriodicIdExcept(oldPeriodicId!, this.itemId)
                .pipe(takeUntilDestroyed(this.destroyRef))
                .subscribe({
                  next: () => {
                    console.log('✅ Eventos repetidos eliminados.');
                  },
                  error: (err) => {
                    console.error('❌ Error al borrar eventos repetidos:', err);
                    this.generalService.handleHttpError(err);
                  },
                });
            },
            error: (err) => {
              console.error('❌ Error al guardar evento como individual:', err);
              this.generalService.handleHttpError(err);
            },
          });
      } else {
        // 🟢 Guardado normal (evento nuevo o aún periódico)
        this.eventsFacade
          .editEvent(this.itemId, formData)
          .pipe(takeUntilDestroyed(this.destroyRef))
          .subscribe({
            next: () => {
              console.log('✅ Evento guardado.');
            },
            error: (err) => {
              console.error('❌ Error al guardar evento:', err);
              this.generalService.handleHttpError(err);
            },
          });
      }
    }
  }

  // Función auxiliar para sumar 3 horas y normalizar formato HH:mm:ss
  private calcTimeEnd(timeStart: string): string {
    const [h, m] = timeStart.split(':');
    const hours = parseInt(h, 10);
    const minutes = parseInt(m, 10);

    let newHours = hours + 3;
    if (newHours >= 24) {
      newHours -= 24;
    }

    const pad = (n: number) => (n < 10 ? '0' + n : n);
    return `${pad(newHours)}:${pad(minutes)}:00`; // Normalizamos a HH:mm:ss
  }
}
