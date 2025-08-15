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
import { SpinnerLoadingComponent } from 'src/app/shared/components/spinner-loading/spinner-loading.component';
import {
  dateRangeValidator,
  periodicHasMultipleDatesValidator,
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
    SpinnerLoadingComponent,
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
  submitted = false;
  titleForm: string = 'Registrar evento';
  buttonAction: string = 'Guardar';
  typeList = TypeList.Events;
  statusEvent = statusEvent;
  enumStatusEnum = EnumStatusEvent;
  showOrganizers = false;
  showCollaborators = false;
  showSponsors = false;

  eventTypeMacro: 'event' | 'macro' = 'event';
  eventTypeProject: 'event' | 'project' = 'event';
  eventTypePeriod: 'event' | 'single' | 'periodic' = 'event';
  eventTypeUbication: 'place' | 'online' | 'pending' = 'pending';
  eventTypeAccess: 'FREE' | 'TICKETS' | 'UNSPECIFIED' = 'UNSPECIFIED';
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
      access: new FormControl('UNSPECIFIED'),
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
    {
      validators: [
        dateRangeValidator,
        timeRangeValidator,
        periodicHasMultipleDatesValidator,
      ],
    }
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
    this.isLoading = true; // Activamos el spinner desde el inicio
    console.log('ID', this.itemId, this.item);
    if (this.itemId === 0 || !this.itemId) {
      // Si es duplicar, aquí es donde gestionas la lógica para obtener los datos y detener el spinner
      if (this.item) {
        this.populateFormWithEvent(this.item!).subscribe(() => {
          this.isLoading = false; // Detenemos el spinner cuando los datos se carguen
        });
      } else {
        // Si itemId es 0 o no está presente, es un evento nuevo o duplicado
        // Desactivamos el spinner para un evento nuevo
        this.isLoading = false;
        this.formEvent.reset(); // Limpiamos el formulario
        this.titleForm = 'Registrar evento';
        this.buttonAction = 'Guardar';
      }

      // this.isLoading = false;
    } else {
      // Si el itemId está presente, cargamos los datos del evento
      this.loadEventData(this.itemId);
    }

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
    if (changes['itemId'] && changes['itemId'].currentValue) {
      const newId = changes['itemId'].currentValue;

      if (newId !== 0) {
        // Si el itemId cambia y no es un evento nuevo (no es 0),
        // cargamos los datos del evento
        this.isLoading = true; // Activamos el spinner mientras cargamos
        this.loadEventData(newId);
      }
    }
    // 👇 Manejo cuando es duplicar o crear (ya tienes la data directamente)
    if (changes['item'] && changes['item'].currentValue && this.itemId === 0) {
      this.isLoading = true; // Activar spinner mientras se carga el evento para duplicar
      this.formEvent.reset(); // ← Limpiar el formulario
      this.populateFormWithEvent(this.item!).subscribe(() => {
        this.isLoading = false; // Desactivar el spinner una vez que los datos se carguen
      });
    }
  }

  private loadEventData(eventId: number): void {
    this.eventsFacade.loadEventById(eventId);

    this.eventsFacade.selectedEvent$
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        filter(
          (event): event is EventModelFullData =>
            !!event && event.id === eventId
        ),
        tap(() => this.formEvent.reset()), // Limpiamos el formulario para evitar datos viejos
        switchMap((event) => this.populateFormWithEvent(event))
      )
      .subscribe(() => {
        this.isLoading = false; // Desactivamos el spinner cuando los datos se cargan
      });
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
            access: event.access,
            tickets_method: event.tickets_method,
            macroevent_id: event.macroevent_id,
            project_id: event.project_id,
            online_link: event.online_link ?? '',
            periodic: event.periodic ?? false,
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

        // if (
        //   Array.isArray(parsedTicketPrices) &&
        //   parsedTicketPrices.length > 0
        // ) {
        //   this.eventTypeAccess = 'TICKETS';
        // } else {
        //   this.eventTypeAccess = 'UNSPECIFIED';
        // }

        this.ticketPrices.clear();
        parsedTicketPrices.forEach((ticket) => {
          this.ticketPrices.push(
            this.createTicketPriceForm(ticket.type, ticket.price)
          );
        });
        switch (event.access as 'FREE' | 'TICKETS' | 'UNSPECIFIED') {
          case 'TICKETS':
            // No añadirá fila vacía porque ya hay prices cargados
            this.setEventTypeAccess('TICKETS');
            break;

          case 'FREE':
            // Limpia ticketPrices y deja el botón FREE activo
            this.setEventTypeAccess('FREE');
            break;

          default:
            // Cubre 'UNSPECIFIED' o valores inesperados
            this.setEventTypeAccess('UNSPECIFIED');
            break;
        }
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
        if (event.periodic) {
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
      this.formEvent.patchValue({ periodic: false, periodic_id: '' });
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
      this.formEvent.patchValue({ periodic: true });
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
  setEventTypeAccess(type: 'FREE' | 'TICKETS' | 'UNSPECIFIED'): void {
    this.eventTypeAccess = type;

    if (type === 'TICKETS') {
      // Asegúrate de que haya al menos una fila:
      if (this.ticketPrices.length === 0) {
        this.addTicketPrice();
      }
      this.formEvent.patchValue({ inscription_method: '' });
      this.formEvent.patchValue({ access: 'TICKETS' });
    }
    if (type === 'FREE') {
      // Opcional: si quieres limpiar cuando cambie a otro tipo
      this.ticketPrices.clear();
      this.formEvent.patchValue({ tickets_method: '' });
      this.formEvent.patchValue({ access: 'FREE' });
    }
    if (type === 'UNSPECIFIED') {
      this.ticketPrices.clear();
      this.formEvent.patchValue({ tickets_method: '' });
      this.formEvent.patchValue({ access: 'UNSPECIFIED' });
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
    this.submitted = true;

    const isPeriodic = this.eventTypePeriod === 'periodic';
    this.formEvent.patchValue({ periodic: isPeriodic });

    if (this.formEvent.invalid) {
      const hasDate = isPeriodic
        ? this.repeatedDates.controls.some((fg) => !!fg.get('start')?.value)
        : !!this.formEvent.get('start')?.value;

      if (!hasDate) {
        console.warn('Debe añadir al menos una fecha válida');
        return;
      }

      this.logFormErrors();
      return;
    }

    const rawValues = this.formEvent.getRawValue();

    if (!rawValues.end && rawValues.start) {
      rawValues.end = rawValues.start;
    }

    const isTimeEndEmpty =
      !rawValues.time_end ||
      rawValues.time_end === '00:00' ||
      rawValues.time_end === '00:00:00';

    if (isTimeEndEmpty) {
      rawValues.time_end = rawValues.time_start
        ? this.calcTimeEnd(rawValues.time_start)
        : '';
    }

    // Construcción base
    const baseData = {
      ...rawValues,
      macroevent_id: rawValues.macroevent_id
        ? Number(rawValues.macroevent_id)
        : null,
      project_id: rawValues.project_id ? Number(rawValues.project_id) : null,
      organizer: this.organizers.getRawValue().map((a) => a.agent_id),
      collaborator: this.collaborators.getRawValue().map((a) => a.agent_id),
      sponsor: this.sponsors.getRawValue().map((a) => a.agent_id),
      ticket_prices: this.ticketPrices.getRawValue(),
    };

    // Si es periódico, añadimos los pases
    if (isPeriodic) {
      const repeated = this.repeatedDates.getRawValue();
      if (!repeated.length) {
        console.warn('Debe incluir al menos una fecha de pase');
        return;
      }

      const periodic_id = rawValues.periodic_id?.trim() || this.generateUUID();
      baseData.periodic_id = periodic_id;
      baseData.repeated_dates = repeated;

      // 👉 Establecer start y end del evento principal a la primera fecha
      const first = repeated.find((r) => !!r.start);
      if (first) {
        baseData.start = first.start;
        baseData.end = first.end || first.start;

        const isTimeEndEmpty =
          !first.time_end ||
          first.time_end === '00:00' ||
          first.time_end === '00:00:00';

        baseData.time_start = first.time_start || '';

        if (first.time_start && !first.time_end) {
          baseData.time_end = this.calcTimeEnd(first.time_start);
        } else {
          baseData.time_end = first.time_end || '';
        }
      }
    } else {
      baseData.periodic_id = '';
      baseData.repeated_dates = [];
    }

    // Limpieza de descripción
    if (baseData.description) {
      baseData.description = baseData.description.replace(/&nbsp;/g, ' ');
    }

    // Crea el único FormData para enviar
    const formData = this.generalService.createFormData(
      baseData,
      { img: this.selectedImageFile },
      this.itemId
    );

    this.sendFormEvent.emit({
      itemId: this.itemId || 0,
      formData,
    });
  }

  private logFormErrors(): void {
    const formErrors = this.formEvent.errors;
    if (formErrors) {
      console.warn('Errores generales del formulario:', formErrors);
    }

    Object.entries(this.formEvent.controls).forEach(([key, control]) => {
      if (control.invalid) {
        console.warn(`Campo inválido "${key}":`, control.errors);
      }
    });
  }
  // Función auxiliar para sumar 3 horas y normalizar formato HH:mm:ss
  private calcTimeEnd(timeStart: string): string {
    if (!timeStart || !timeStart.includes(':')) return '';

    const [h, m] = timeStart.split(':');
    const hours = parseInt(h, 10);
    const minutes = parseInt(m, 10);

    if (isNaN(hours) || isNaN(minutes)) return '';

    let newHours = hours + 3;
    if (newHours >= 24) {
      newHours -= 24;
    }

    const pad = (n: number) => (n < 10 ? '0' + n : n);
    return `${pad(newHours)}:${pad(minutes)}:00`;
  }
}
