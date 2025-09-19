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
import {
  filter,
  forkJoin,
  map,
  Observable,
  of,
  switchMap,
  take,
  tap,
} from 'rxjs';
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
  dateBetween,
  dateRangeValidator,
  periodicHasMultipleDatesValidator,
  timeRangeValidator,
  uniqueDateTimeValidator,
} from 'src/app/shared/utils/validators.utils';
import { FilterTransformCodePipe } from '../../../../../../shared/pipe/filterTransformCode.pipe';
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
    FilterTransformCodePipe,
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
  readonly minDate = new Date(2018, 0, 1); // > 2018 ⇒ desde 2018-01-01
  readonly maxDate = (() => {
    const nextYear = new Date().getFullYear() + 1;
    return new Date(nextYear, 11, 31, 0, 0, 0, 0);
  })();

  @Input() item!: EventModelFullData | null;
  @Input() itemId!: number;
  @Output() submitForm = new EventEmitter<{
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
  enumStatusEvent = EnumStatusEvent;
  showOrganizers = false;
  showCollaborators = false;
  showSponsors = false;

  eventTypeMacro: 'SINGLE' | 'MACRO' = 'SINGLE';
  eventTypeProject: 'NO_PROJECT' | 'PROJECT' = 'NO_PROJECT';
  eventTypePeriod: 'event' | 'single' | 'periodic' = 'event';
  eventTypeUbication: 'place' | 'online' | 'pending' = 'pending';
  eventTypeAccess: 'FREE' | 'TICKETS' | 'UNSPECIFIED' = 'UNSPECIFIED';
  eventTypeStatus: EnumStatusEvent = EnumStatusEvent.EJECUCION;
  eventTypeInscription: 'unlimited' | 'inscription' = 'unlimited';

  formEvent = new FormGroup(
    {
      title: new FormControl('', [Validators.required]),
      start: new FormControl('', [
        Validators.required,
        dateBetween(this.minDate, this.maxDate),
      ]),
      end: new FormControl('', [dateBetween(this.minDate, this.maxDate)]),
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
        validators: [uniqueDateTimeValidator],
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
  private originalIdForDuplicate: number | null = null;

  ngOnInit(): void {
    this.isLoading = true;
    if (this.itemId === 0 || !this.itemId) {
      if (this.item) {
        this.populateFormWithEvent(this.item!).subscribe(() => {
          this.isLoading = false;
        });
      } else {
        this.isLoading = false;
        this.formEvent.reset();
        this.titleForm = 'Registrar evento';
        this.buttonAction = 'Guardar';
      }
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
        this.isLoading = true;
        this.loadEventData(newId);
      }
    }

    if (changes['item'] && changes['item'].currentValue && this.itemId === 0) {
      this.originalIdForDuplicate = this.item?.id ?? null;
      this.isLoading = true;
      this.formEvent.reset();
      this.populateFormWithEvent(this.item!).subscribe(() => {
        this.isLoading = false;
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
        tap(() => this.formEvent.reset()),
        switchMap((event) => this.populateFormWithEvent(event))
      )
      .subscribe(() => {
        this.isLoading = false;
      });
  }

  private populateFormWithEvent(event: EventModelFullData): Observable<void> {
    this.wasPeriodic = false;
    this.submitted = false;
    this.organizers.clear();
    this.collaborators.clear();
    this.sponsors.clear();

    if (this.itemId === 0 && event?.id) {
      this.originalIdForDuplicate = event.id;
    }
    const year = this.generalService.getYearFromDate(event.start);

    const yearData$ = this.loadYearlyData(year);
    const passes$ =
      event.periodic && event.periodic_id
        ? this.eventsFacade
            .loadEventsByPeriodicId(event.periodic_id)
            .pipe(take(1))
        : of([]);

    return forkJoin([yearData$, passes$]).pipe(
      tap(([_, passes]) => {
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
        if (event.macroevent_id) {
          this.eventTypeMacro = 'MACRO';
        }
        if (event.project_id) {
          this.eventTypeProject = 'PROJECT';
        }
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

        this.ticketPrices.clear();
        parsedTicketPrices.forEach((ticket) => {
          this.ticketPrices.push(
            this.createTicketPriceForm(ticket.type, ticket.price)
          );
        });
        switch (event.access as 'FREE' | 'TICKETS' | 'UNSPECIFIED') {
          case 'TICKETS':
            this.setEventTypeAccess('TICKETS');
            break;
          case 'FREE':
            this.setEventTypeAccess('FREE');
            break;
          default:
            this.setEventTypeAccess('UNSPECIFIED');
            break;
        }
        this.eventTypeInscription = event.inscription
          ? 'inscription'
          : 'unlimited';

        switch (event.status) {
          case EnumStatusEvent.EJECUCION:
            this.eventTypeStatus = EnumStatusEvent.EJECUCION;
            break;
          case EnumStatusEvent.CANCELADO:
            this.eventTypeStatus = EnumStatusEvent.CANCELADO;
            break;
          case EnumStatusEvent.APLAZADO:
            this.eventTypeStatus = EnumStatusEvent.APLAZADO;
            break;
          case EnumStatusEvent.AGOTADO:
            this.eventTypeStatus = EnumStatusEvent.AGOTADO;
            break;
          default:
            this.eventTypeStatus = EnumStatusEvent.EJECUCION;
            break;
        }

        this.generalService.enableInputControls(this.formEvent, [
          'project_id',
          'macroevent_id',
        ]);

        if (event.periodic) {
          this.eventTypePeriod = 'periodic';
          this.wasPeriodic = true;

          this.repeatedDates.clear();

          const sorted = [...(passes as any[])].sort(
            (a, b) =>
              a.start.localeCompare(b.start) ||
              (a.time_start || '').localeCompare(b.time_start || '')
          );

          // ✅ Empuja TODOS los pases, incluido el actual (con su id)
          sorted.forEach((e) => {
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

          // Recalcular validaciones tras hidratar
          this.repeatedDates.updateValueAndValidity({ emitEvent: true });
        } else {
          this.eventTypePeriod = 'single';
          this.repeatedDates.clear();
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

        const orgs = this.uniqById(event.organizer);
        const cols = this.uniqById(event.collaborator);
        const spons = this.uniqById(event.sponsor);

        this.showOrganizers = orgs.length > 0;
        this.showCollaborators = cols.length > 0;
        this.showSponsors = spons.length > 0;

        orgs.forEach((a) => this.organizers.push(this.createAgentForm(a.id)));
        cols.forEach((a) =>
          this.collaborators.push(this.createAgentForm(a.id))
        );
        spons.forEach((a) => this.sponsors.push(this.createAgentForm(a.id)));

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

  private uniqById<T extends { id?: number }>(arr: T[] = []): T[] {
    const seen = new Set<number>();
    return arr.filter((a) => {
      const id = typeof a?.id === 'number' ? a.id : NaN;
      if (Number.isNaN(id) || seen.has(id)) return false;
      seen.add(id);
      return true;
    });
  }

  private loadYearlyData(year: number): Observable<void> {
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
      this.formEvent.get('img')?.setValue(null);
      return;
    }

    const result = await this.generalService.handleFileSelection(file);
    this.selectedImageFile = result.file;
    this.imageSrc = result.imageSrc;
  }

  setEventTypePeriod(type: 'event' | 'single' | 'periodic'): void {
    this.eventTypePeriod = type;

    const startControl = this.formEvent.get('start');
    const endControl = this.formEvent.get('end');

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
      startControl?.setValidators([
        Validators.required,
        dateBetween(this.minDate, this.maxDate),
      ]);
      endControl?.setValidators([dateBetween(this.minDate, this.maxDate)]);
      startControl?.updateValueAndValidity({ emitEvent: false });
      endControl?.updateValueAndValidity({ emitEvent: false });
    } else if (type === 'periodic') {
      // Guarda valores actuales antes de limpiar
      const curStart = this.formEvent.get('start')?.value || null;
      const curEnd = this.formEvent.get('end')?.value || curStart;
      const curTs = this.formEvent.get('time_start')?.value || '';
      const curTe = this.formEvent.get('time_end')?.value || '';

      this.formEvent.patchValue({ periodic: true });
      this.wasPeriodic = true;

      // Limpia cabeceras para que el usuario gestione solo el array
      this.formEvent.patchValue({
        start: null,
        end: null,
        time_start: null,
        time_end: null,
      });

      startControl?.clearValidators();
      startControl?.updateValueAndValidity();

      this.repeatedDates.clear();

      // ✅ Si venimos de single con valores, siembra ese pase
      if (curStart) {
        this.repeatedDates.push(
          this.fb.group({
            start: [
              curStart,
              [Validators.required, dateBetween(this.minDate, this.maxDate)],
            ],
            end: [curEnd, [dateBetween(this.minDate, this.maxDate)]],
            time_start: [curTs],
            time_end: [curTe],
          })
        );
      } else {
        this.addRepeatedDate();
      }

      this.repeatedDates.updateValueAndValidity({ emitEvent: true });
    }
  }

  setEventTypeUbication(type: 'place' | 'online' | 'pending'): void {
    this.eventTypeUbication = type;
    const onlineLinkControl = this.formEvent.get('online_link');

    if (type === 'online') {
      this.formEvent.patchValue({
        province: '',
        town: '',
        place_id: null,
        sala_id: null,
        capacity: null,
      });

      onlineLinkControl?.setValidators([
        Validators.required,
        Validators.pattern(/^https?:\/\/.+$/),
      ]);
    } else {
      onlineLinkControl?.clearValidators();
      onlineLinkControl?.setValue('');
    }
    onlineLinkControl?.updateValueAndValidity();
  }

  setEventTypeMacro(type: 'SINGLE' | 'MACRO'): void {
    this.eventTypeMacro = type;
    this.formEvent.patchValue({ macroevent_id: null });
  }

  setEventTypeProject(type: 'NO_PROJECT' | 'PROJECT'): void {
    this.eventTypeProject = type;
    this.formEvent.patchValue({ project_id: null });
  }

  setEventTypeAccess(type: 'FREE' | 'TICKETS' | 'UNSPECIFIED'): void {
    this.eventTypeAccess = type;

    if (type === 'TICKETS') {
      if (this.ticketPrices.length === 0) {
        this.addTicketPrice();
      }
      this.formEvent.patchValue({ inscription_method: '' });
      this.formEvent.patchValue({ access: 'TICKETS' });
    }
    if (type === 'FREE') {
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

  setEventTypeStatus(type: EnumStatusEvent): void {
    this.eventTypeStatus = type;

    const statusReasonRequired = type !== EnumStatusEvent.EJECUCION;

    this.formEvent.patchValue({
      status: type,
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
        start: [
          '',
          [Validators.required, dateBetween(this.minDate, this.maxDate)],
        ],
        end: ['', [dateBetween(this.minDate, this.maxDate)]],
        time_start: [''],
        time_end: [''],
      })
    );
    // 🔁 recalcula validaciones
    this.repeatedDates.updateValueAndValidity({ emitEvent: true });
  }

  removeRepeatedDate(index: number): void {
    this.repeatedDates.removeAt(index);
    // 🔁 recalcula validaciones
    this.repeatedDates.updateValueAndValidity({ emitEvent: true });
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

  private normTime(t?: string | null): string {
    if (!t) return '';
    const [h, m] = t.split(':');
    const hh = (h ?? '0').padStart(2, '0');
    const mm = (m ?? '0').padStart(2, '0');
    return `${hh}:${mm}:00`;
  }

  private uniqByDateAndTime<
    T extends {
      start?: string;
      end?: string;
      time_start?: string | null;
      time_end?: string | null;
    }
  >(arr: T[]): T[] {
    const seen = new Set<string>();
    const out: T[] = [];
    for (const r of arr) {
      const d = (r.start || '').slice(0, 10);
      if (!d) continue;
      const ts = this.normTime(r.time_start || '00:00');
      const key = `${d}|${ts}`;
      if (seen.has(key)) continue; // elimina duplicados exactos fecha+hora
      out.push({
        ...r,
        start: d as any,
        end: (r.end?.slice(0, 10) || d) as any,
        time_start: r.time_start ?? '',
        time_end: r.time_end ?? '',
      });
      seen.add(key);
    }
    return out;
  }

  onSendFormEvent(): void {
    console.log('📤 Enviando formulario…');
    this.submitted = true;

    const normTime = (t?: string | null): string => {
      if (!t) return '';
      const [h = '0', m = '0'] = t.split(':');
      return `${h.padStart(2, '0')}:${m.padStart(2, '0')}:00`;
    };
    const isEmptyOrMidnight = (v?: string | null) =>
      !v || v === '00:00' || v === '00:00:00';

    const isPeriodic = this.eventTypePeriod === 'periodic';
    this.formEvent.patchValue({ periodic: isPeriodic });

    // Autocompletar end y time_end en cabecera
    const start = this.formEvent.get('start')?.value as string | null;
    const end = this.formEvent.get('end')?.value as string | null;
    if (!end && start) {
      this.formEvent.get('end')?.setValue(start, { emitEvent: false });
    }

    const ts = this.formEvent.get('time_start')?.value as string | null;
    const te = this.formEvent.get('time_end')?.value as string | null;

    if (ts && isEmptyOrMidnight(te)) {
      this.formEvent
        .get('time_end')
        ?.setValue(this.calcTimeEnd(ts), { emitEvent: false });
    }

    this.formEvent.updateValueAndValidity({ emitEvent: false });

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

    const isTimeEndEmptyRaw =
      !rawValues.time_end ||
      rawValues.time_end === '00:00' ||
      rawValues.time_end === '00:00:00';

    if (isTimeEndEmptyRaw) {
      rawValues.time_end = rawValues.time_start
        ? this.calcTimeEnd(rawValues.time_start)
        : '';
    }

    const toNum = (v: any) =>
      v === null || v === undefined || v === '' ? null : Number(v);

    const getIds = (fa: FormArray) =>
      Array.from(
        new Set(
          (fa.getRawValue() as Array<{ agent_id: any }>)
            .map((a) => toNum(a.agent_id))
            .filter((n): n is number => Number.isFinite(n))
        )
      );

    const baseData: any = {
      ...rawValues,
      macroevent_id: rawValues.macroevent_id
        ? Number(rawValues.macroevent_id)
        : null,
      project_id: rawValues.project_id ? Number(rawValues.project_id) : null,
      organizer: getIds(this.organizers),
      collaborator: getIds(this.collaborators),
      sponsor: getIds(this.sponsors),
      ticket_prices: this.ticketPrices.getRawValue(),
    };

    if (isPeriodic) {
      const rdRaw = this.repeatedDates.getRawValue() as Array<{
        id?: number;
        start?: string;
        end?: string;
        time_start?: string | null;
        time_end?: string | null;
      }>;

      if (!rdRaw.length) {
        console.warn('Debe incluir al menos una fecha de pase');
        return;
      }

      // Normaliza, autocompleta time_end y CONSERVA id
      const seen = new Set<string>();
      const rdNorm = rdRaw
        .map((r) => {
          const d = (r.start || '').slice(0, 10);
          if (!d) return null;
          const e = (r.end && r.end.slice(0, 10)) || d;
          const tStart = normTime(r.time_start || '00:00');
          let tEnd = r.time_end || '';
          if (tStart && isEmptyOrMidnight(tEnd)) {
            tEnd = this.calcTimeEnd(tStart);
          }
          return {
            id: typeof r.id === 'number' ? r.id : undefined,
            start: d,
            end: e,
            time_start: tStart || '',
            time_end: tEnd || '',
          };
        })
        .filter(Boolean) as Array<{
        id?: number;
        start: string;
        end: string;
        time_start: string;
        time_end: string;
      }>;

      // Dedup exacto por (fecha|hora) manteniendo el primero
      const repeated: typeof rdNorm = [];
      for (const r of rdNorm) {
        const key = `${r.start}|${r.time_start}`;
        if (seen.has(key)) continue;
        seen.add(key);
        repeated.push(r);
      }

      // Asegura campos principales obligatorios
      let mainDate = (rawValues.start as string | null)?.slice(0, 10) || null;
      if (!mainDate && repeated.length) {
        mainDate = repeated
          .slice()
          .sort(
            (a, b) =>
              a.start.localeCompare(b.start) ||
              a.time_start.localeCompare(b.time_start)
          )[0].start;
      }
      baseData.start = mainDate || repeated[0]?.start || '';
      baseData.end = baseData.end || baseData.start;
      if (
        (!baseData.time_end ||
          baseData.time_end === '00:00' ||
          baseData.time_end === '00:00:00') &&
        baseData.time_start
      ) {
        baseData.time_end = this.calcTimeEnd(baseData.time_start);
      }

      const periodic_id =
        (rawValues.periodic_id?.trim() as string | undefined) ||
        (this.item?.periodic_id as string | undefined) ||
        this.generateUUID();

      baseData.periodic_id = periodic_id;
      // ❗️Mandamos TODOS los pases, incluido el principal
      baseData.repeated_dates = repeated;
    } else {
      baseData.periodic_id = '';
      baseData.repeated_dates = [];
    }

    if (baseData.description) {
      baseData.description = baseData.description.replace(/&nbsp;/g, ' ');
    }
    const duplicateFromId =
      (!this.itemId || this.itemId === 0) && this.originalIdForDuplicate
        ? this.originalIdForDuplicate
        : null;

    const formData = this.createEventFormDataForPhp(
      baseData,
      { img: this.selectedImageFile },
      this.itemId || null,
      this.itemId ? 'PATCH' : 'POST',
      duplicateFromId
    );
    for (const [k, v] of (formData as any).entries()) {
      console.log('FD', k, v);
    }

    this.submitForm.emit({ itemId: this.itemId || 0, formData });
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

  /** Crea FormData alineado con events.php */
  private createEventFormDataForPhp(
    data: {
      title: string;
      start: string;
      end: string;
      time_start?: string;
      time_end?: string;
      description?: string;
      province?: string;
      town?: string;
      place_id?: number | null;
      sala_id?: number | null;
      capacity?: number | null;
      access: 'FREE' | 'TICKETS' | 'UNSPECIFIED';
      ticket_prices: Array<{ type: string; price: number | null }>;
      status: EnumStatusEvent;
      status_reason?: string;
      inscription: boolean;
      inscription_method?: string;
      tickets_method?: string;
      online_link?: string;
      periodic: boolean;
      periodic_id?: string | null;
      repeated_dates: Array<{
        id?: number;
        start: string;
        end?: string;
        time_start?: string;
        time_end?: string;
      }>;
      macroevent_id?: number | null;
      project_id?: number | null;
      organizer: number[];
      collaborator: number[];
      sponsor: number[];
    },
    files?: { img?: File | null },
    itemId?: number | null,
    methodOverride?: 'PATCH' | 'POST',
    duplicateFromId?: number | null
  ): FormData {
    const fd = new FormData();

    const put = (k: string, v: any) => {
      if (v === null || v === undefined) {
        fd.append(k, '');
        return;
      }
      if (typeof v === 'boolean') {
        fd.append(k, v ? 'true' : 'false');
      } else {
        fd.append(k, String(v));
      }
    };

    // Campos simples
    put('title', data.title ?? '');
    put('start', data.start ?? '');
    put('end', data.end ?? '');
    put('time_start', data.time_start ?? '');
    put('time_end', data.time_end ?? '');
    put('description', data.description ?? '');
    put('province', data.province ?? '');
    put('town', data.town ?? '');
    put('access', data.access ?? 'UNSPECIFIED');
    put('status', data.status ?? EnumStatusEvent.EJECUCION);
    put('status_reason', data.status_reason ?? '');
    put('inscription', !!data.inscription);
    put('inscription_method', data.inscription_method ?? '');
    put('tickets_method', data.tickets_method ?? '');
    put('online_link', data.online_link ?? '');
    put('periodic', !!data.periodic);
    put('periodic_id', data.periodic_id ?? '');

    // Numéricos opcionales
    put('place_id', typeof data.place_id === 'number' ? data.place_id : '');
    put('sala_id', typeof data.sala_id === 'number' ? data.sala_id : '');
    put('capacity', typeof data.capacity === 'number' ? data.capacity : '');

    // macro/proyecto
    put(
      'macroevent_id',
      typeof data.macroevent_id === 'number' ? data.macroevent_id : ''
    );
    put(
      'project_id',
      typeof data.project_id === 'number' ? data.project_id : ''
    );

    // Agents
    if (data.organizer.length === 0) fd.append('organizer[]', '');
    data.organizer.forEach((id) => fd.append('organizer[]', String(id)));

    if (data.collaborator.length === 0) fd.append('collaborator[]', '');
    data.collaborator.forEach((id) => fd.append('collaborator[]', String(id)));

    if (data.sponsor.length === 0) fd.append('sponsor[]', '');
    data.sponsor.forEach((id) => fd.append('sponsor[]', String(id)));

    // ticket_prices
    if (data.ticket_prices.length === 0) {
      fd.append('ticket_prices[0][type]', '');
      fd.append('ticket_prices[0][price]', '');
    } else {
      data.ticket_prices.forEach((tp, i) => {
        fd.append(`ticket_prices[${i}][type]`, tp?.type ?? '');
        fd.append(
          `ticket_prices[${i}][price]`,
          tp?.price != null ? String(tp.price) : ''
        );
      });
    }

    // repeated_dates (como JSON) — incluye id cuando exista
    fd.append('repeated_dates', JSON.stringify(data.repeated_dates ?? []));

    // Imagen
    const rawImg = (this.formEvent.get('img')?.value ?? '').toString().trim();
    const currentImg = rawImg.split('/').pop() ?? rawImg;

    if (files?.img) {
      fd.append('img', files.img);
    } else if (currentImg) {
      fd.append('img', currentImg);
    }

    if (duplicateFromId != null) {
      fd.append('duplicate_from_id', String(duplicateFromId));
    }

    const idNum = Number(itemId);
    if (methodOverride === 'PATCH' && Number.isFinite(idNum) && idNum > 0) {
      fd.append('_method', 'PATCH');
      fd.append('id', String(idNum));
    }

    return fd;
  }
}
