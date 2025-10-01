import { CommonModule } from '@angular/common';
import {
  ChangeDetectorRef,
  Component,
  DestroyRef,
  ElementRef,
  EventEmitter,
  inject,
  Input,
  NgZone,
  OnChanges,
  OnInit,
  Output,
  SimpleChanges,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import {
  AbstractControl,
  FormArray,
  FormBuilder,
  FormControl,
  FormGroup,
  ReactiveFormsModule,
  ValidationErrors,
  ValidatorFn,
  Validators,
} from '@angular/forms';
import { MatCardModule } from '@angular/material/card';
import townsData from 'data/towns.json';
import { QuillModule } from 'ngx-quill';
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
import { PlacesFacade } from 'src/app/application/places.facade';
import { AgentModel } from 'src/app/core/interfaces/agent.interface';
import {
  CATEGORY_LIST,
  CATEGORY_UI,
  CategoryCode,
  DayEventModel,
  EnumStatusEvent,
  EventModelFullData,
  statusEvent,
} from 'src/app/core/interfaces/event.interface';
import { MacroeventModel } from 'src/app/core/interfaces/macroevent.interface';
import { PlaceModel, SalaModel } from 'src/app/core/interfaces/place.interface';
import { ProjectModel } from 'src/app/core/interfaces/project.interface';
import { TypeList } from 'src/app/core/models/general.model';
import { AgentsService } from 'src/app/core/services/agents.services';
import { MacroeventsService } from 'src/app/core/services/macroevents.services';
import { ProjectsService } from 'src/app/core/services/projects.services';
import { ImageControlComponent } from 'src/app/modules/dashboard/components/image-control/image-control.component';
import { ButtonCategoryComponent } from 'src/app/shared/components/buttons/button-category/button-category.component';
import { ButtonIconComponent } from 'src/app/shared/components/buttons/button-icon/button-icon.component';
import { ButtonSelectComponent } from 'src/app/shared/components/buttons/button-select/button-select.component';
import { SpinnerLoadingComponent } from 'src/app/shared/components/spinner-loading/spinner-loading.component';
import { FilterTransformCodePipe } from 'src/app/shared/pipe/filterTransformCode.pipe';
import { GeneralService } from 'src/app/shared/services/generalService.service';
import {
  dateBetween,
  dateRangeValidator,
  periodicHasMultipleDatesValidator,
  timeRangeValidator,
  uniqueDateTimeValidator,
} from 'src/app/shared/utils/validators.utils';
import { AgentArrayControlComponent } from '../array-agents/array-agents.component';
import { DateArrayControlComponent } from '../array-dates/array-dates.component';

// ------------------------------------------------------
// Helpers mínimos
// ------------------------------------------------------
function arrayNotEmpty(control: FormControl<CategoryCode[] | []>) {
  const v = control.value || [];
  return Array.isArray(v) && v.length > 0 ? null : { required: true };
}

// --- Tipado del bloque de público
type AudienceDTO = {
  allPublic: boolean;
  hasAgeRecommendation: boolean;
  hasRestriction: boolean;
  ages: {
    babies: boolean; // 0–3
    kids: boolean; // 4–11
    teens: boolean; // 12–17
    adults: boolean; // 18+
    seniors: boolean; // 65+
  };
  ageNote: string;
  restrictions: {
    partnersOnly: boolean;
    womenOnly: boolean;
    other: boolean;
    otherText: string;
  };
};

// ------------------------------------------------------
// Validador de "Público" AUTOCONTENIDO en este TS
// - Exactamente UNA opción principal: allPublic XOR hasAgeRecommendation XOR hasRestriction
// - Si allPublic => OK
// - Si hasAgeRecommendation => al menos un rango de edad seleccionado
// - Si hasRestriction => al menos una restricción; si 'other' => otherText requerido
// ------------------------------------------------------
export function audienceValidatorFactory(
  shouldValidate: () => boolean
): ValidatorFn {
  return (fg: AbstractControl): ValidationErrors | null => {
    if (!shouldValidate()) return null; // modo perezoso

    const get = (p: string) => fg.get(p)?.value;
    const all = !!get('allPublic');
    const age = !!get('hasAgeRecommendation');
    const res = !!get('hasRestriction');

    const ages = fg.get('ages')?.value || {};
    const r = fg.get('restrictions')?.value || {};

    const primaryCount = [all, age, res].filter(Boolean).length;

    const errors: ValidationErrors = {};

    if (primaryCount === 0) errors['audienceRequired'] = true;
    if (primaryCount > 1) errors['audiencePrimaryConflict'] = true;

    if (age) {
      const anyAge =
        !!ages.babies ||
        !!ages.kids ||
        !!ages.teens ||
        !!ages.adults ||
        !!ages.seniors;
      if (!anyAge) errors['ageRangeRequired'] = true;
    }

    if (res) {
      const anyR = !!r.partnersOnly || !!r.womenOnly || !!r.other;
      if (!anyR) errors['restrictionRequired'] = true;
      if (r.other && !(r.otherText || '').toString().trim()) {
        errors['restrictionOtherTextRequired'] = true;
      }
    }

    return Object.keys(errors).length ? errors : null;
  };
}

@Component({
  selector: 'app-form-event',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatCardModule,
    ImageControlComponent,
    ButtonIconComponent,
    QuillModule,
    ButtonSelectComponent,
    SpinnerLoadingComponent,
    FilterTransformCodePipe,
    ButtonCategoryComponent,
    AgentArrayControlComponent,
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
  private readonly cdr = inject(ChangeDetectorRef);

  // Para scroll + focus al primer error
  private el = inject(ElementRef<HTMLElement>);
  private zone = inject(NgZone);

  readonly minDate = new Date(2018, 0, 1);
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
  showOrganizers = false;
  showCollaborators = false;
  showSponsors = false;
  enumStatusEvent = EnumStatusEvent;

  public readonly CATEGORY = CATEGORY_UI;
  public readonly category_list = CATEGORY_LIST;
  private enforceAudienceValidation = false;

  eventTypeMacro: 'SINGLE' | 'MACRO' = 'SINGLE';
  eventTypeProject: 'NO_PROJECT' | 'PROJECT' = 'NO_PROJECT';
  eventTypePeriod: 'event' | 'single' | 'periodic' = 'event';
  eventTypeUbication: 'place' | 'online' | 'pending' = 'pending';
  eventTypeAccess: 'FREE' | 'TICKETS' | 'UNSPECIFIED' = 'UNSPECIFIED';
  eventTypeStatus: EnumStatusEvent = EnumStatusEvent.EJECUCION;
  eventTypeInscription: 'unlimited' | 'inscription' = 'unlimited';

  // ------------------------------------------------------
  // Formulario principal
  // ------------------------------------------------------
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
      category: new FormControl<CategoryCode[]>([], {
        nonNullable: true,
        validators: [Validators.required],
      }),
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

  // ------------------------------------------------------
  // Formulario de "Público" (audience)
  // ------------------------------------------------------
  public audienceForm = this.fb.group(
    {
      allPublic: this.fb.control(false, { nonNullable: true }),
      hasAgeRecommendation: this.fb.control(false, { nonNullable: true }),
      hasRestriction: this.fb.control(false, { nonNullable: true }),
      ages: this.fb.group({
        babies: this.fb.control(false, { nonNullable: true }),
        kids: this.fb.control(false, { nonNullable: true }),
        teens: this.fb.control(false, { nonNullable: true }),
        adults: this.fb.control(false, { nonNullable: true }),
        seniors: this.fb.control(false, { nonNullable: true }),
      }),
      ageNote: this.fb.control('', { nonNullable: true }),
      restrictions: this.fb.group({
        partnersOnly: this.fb.control(false, { nonNullable: true }),
        womenOnly: this.fb.control(false, { nonNullable: true }),
        other: this.fb.control(false, { nonNullable: true }),
        otherText: this.fb.control(
          { value: '', disabled: true },
          { nonNullable: true }
        ),
      }),
    },
    {
      validators: [
        audienceValidatorFactory(() => this.enforceAudienceValidation),
      ],
    }
  );

  // Datos auxiliares
  macroevents: MacroeventModel[] = [];
  projects: ProjectModel[] = [];
  provincias: {
    label: string;
    code: string;
    towns: { label: string; code: string }[];
  }[] = [];
  municipios: { label: string; code: string }[] = [];
  espacios: PlaceModel[] = [];
  salasDelLugar: SalaModel[] = [];
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

  // ------------------------------------------------------
  // Ciclo de vida
  // ------------------------------------------------------
  ngOnInit(): void {
    this.isLoading = true;

    // Suscripciones del audience (con teardown)
    this.audienceForm
      .get('allPublic')!
      .valueChanges.pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((v) => {
        const ages = this.audienceForm.get('ages')!;
        const rest = this.audienceForm.get('restrictions')!;
        if (v) {
          ages.patchValue(
            {
              babies: false,
              kids: false,
              teens: false,
              adults: false,
              seniors: false,
            },
            { emitEvent: false }
          );
          rest.patchValue(
            {
              partnersOnly: false,
              womenOnly: false,
              other: false,
              otherText: '',
            },
            { emitEvent: false }
          );
          this.audienceForm.patchValue(
            { hasRestriction: false },
            { emitEvent: false }
          );
        }
      });

    this.audienceForm
      .get('ages')!
      .valueChanges.pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((ages) => {
        const anyAge = Object.values(ages as Record<string, boolean>).some(
          Boolean
        );
        if (anyAge && this.audienceForm.get('allPublic')!.value) {
          this.audienceForm.patchValue(
            { allPublic: false },
            { emitEvent: false }
          );
        }
      });

    this.audienceForm
      .get('restrictions.other')!
      .valueChanges.pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((v) => {
        const otherText = this.audienceForm.get('restrictions.otherText')!;
        v
          ? otherText.enable({ emitEvent: false })
          : otherText.disable({ emitEvent: false });
        if (!v) otherText.setValue('', { emitEvent: false });
      });

    // Carga inicial/duplicado
    if (this.itemId === 0 || !this.itemId) {
      if (this.item) {
        this.populateFormWithEvent(this.item!).subscribe(() => {
          this.isLoading = false;
        });
      } else {
        this.isLoading = false;
        this.formEvent.reset();
        // audience reset también
        this.resetAudienceForm();
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
      this.resetAudienceForm();
      this.populateFormWithEvent(this.item!).subscribe(() => {
        this.isLoading = false;
      });
    }
  }

  // ------------------------------------------------------
  // Getters y UI helpers
  // ------------------------------------------------------
  get categoryCtrl(): FormControl<CategoryCode[]> {
    return this.formEvent.get('category') as FormControl<CategoryCode[]>;
  }
  isCategoryActive(code: CategoryCode): boolean {
    return this.categoryCtrl.value.includes(code);
  }
  toggleCategory(code: CategoryCode): void {
    const current = [...this.categoryCtrl.value];
    const i = current.indexOf(code);
    i >= 0 ? current.splice(i, 1) : current.push(code);
    this.categoryCtrl.setValue(current);
  }

  get repeatedDates(): FormArray {
    return this.formEvent.get('repeated_dates') as FormArray;
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
  get ticketPrices(): FormArray {
    return this.formEvent.get('ticket_prices') as FormArray;
  }
  get isTypePeriodSelected(): boolean {
    return (
      this.eventTypePeriod === 'single' || this.eventTypePeriod === 'periodic'
    );
  }

  // ------------------------------------------------------
  // Carga e hidratación
  // ------------------------------------------------------
  private loadEventData(eventId: number): void {
    this.eventsFacade.loadEventById(eventId);

    this.eventsFacade.selectedEvent$
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        filter(
          (event): event is EventModelFullData =>
            !!event && event.id === eventId
        ),
        tap(() => {
          this.formEvent.reset();
          this.resetAudienceForm();
        }),
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
            category: (event.category ?? []) as CategoryCode[],
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
        if (event.macroevent_id) this.eventTypeMacro = 'MACRO';
        if (event.project_id) this.eventTypeProject = 'PROJECT';
        if (event.place_id) this.eventTypeUbication = 'place';
        else if (event.online_link) this.eventTypeUbication = 'online';
        else this.eventTypeUbication = 'pending';

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

        // --- Hidratar audience
        this.patchAudienceFromEvent(event);
      }),
      map(() => void 0)
    );
  }

  private patchAudienceFromEvent(event?: Partial<EventModelFullData>): void {
    const raw = (event as any)?.audience;

    if (!raw || raw === 'null') {
      this.resetAudienceForm();
      this.cdr.markForCheck();
      return;
    }

    let parsed: any = null;
    try {
      parsed = typeof raw === 'string' ? JSON.parse(raw) : raw;
    } catch {
      parsed = null;
    }
    if (!parsed || typeof parsed !== 'object') {
      this.resetAudienceForm();
      this.cdr.markForCheck();
      return;
    }

    const b = (v: any) => v === true || v === 'true' || v === 1 || v === '1';

    const norm = {
      allPublic: b(parsed.allPublic),
      hasAgeRecommendation: b(parsed.hasAgeRecommendation),
      hasRestriction: b(parsed.hasRestriction),
      ages: {
        babies: b(parsed.ages?.babies),
        kids: b(parsed.ages?.kids),
        teens: b(parsed.ages?.teens),
        adults: b(parsed.ages?.adults),
        seniors: b(parsed.ages?.seniors),
      },
      ageNote: typeof parsed.ageNote === 'string' ? parsed.ageNote : '',
      restrictions: {
        partnersOnly: b(parsed.restrictions?.partnersOnly),
        womenOnly: b(parsed.restrictions?.womenOnly),
        other: b(parsed.restrictions?.other),
        otherText:
          typeof parsed.restrictions?.otherText === 'string'
            ? parsed.restrictions.otherText
            : '',
      },
    };

    if (norm.allPublic) {
      norm.hasAgeRecommendation = false;
      norm.hasRestriction = false;
      norm.ages = {
        babies: false,
        kids: false,
        teens: false,
        adults: false,
        seniors: false,
      };
      norm.ageNote = '';
      norm.restrictions = {
        partnersOnly: false,
        womenOnly: false,
        other: false,
        otherText: '',
      };
    } else if (norm.hasAgeRecommendation) {
      norm.hasRestriction = false;
      const anyAge = Object.values(norm.ages).some(Boolean);
      if (!anyAge) norm.ages.kids = true;
      norm.restrictions = {
        partnersOnly: false,
        womenOnly: false,
        other: false,
        otherText: '',
      };
    } else if (norm.hasRestriction) {
      norm.hasAgeRecommendation = false;
      norm.allPublic = false;
      norm.ages = {
        babies: false,
        kids: false,
        teens: false,
        adults: false,
        seniors: false,
      };
      norm.ageNote = '';
      if (!norm.restrictions.other) norm.restrictions.otherText = '';
    } else {
      norm.allPublic = false;
      norm.hasAgeRecommendation = false;
      norm.hasRestriction = false;
    }

    this.audienceForm.patchValue(norm, { emitEvent: false });

    const other = !!norm.restrictions.other;
    const otherTextCtrl = this.audienceForm.get('restrictions.otherText')!;
    other
      ? otherTextCtrl.enable({ emitEvent: false })
      : otherTextCtrl.disable({ emitEvent: false });

    this.enforceAudienceValidation = false;
    this.audienceForm.updateValueAndValidity({ emitEvent: false });

    this.cdr.markForCheck();
  }

  private resetAudienceForm(): void {
    this.audienceForm.reset(
      {
        allPublic: false,
        hasAgeRecommendation: false,
        hasRestriction: false,
        ages: {
          babies: false,
          kids: false,
          teens: false,
          adults: false,
          seniors: false,
        },
        ageNote: '',
        restrictions: {
          partnersOnly: false,
          womenOnly: false,
          other: false,
          otherText: '',
        },
      },
      { emitEvent: false }
    );
    this.audienceForm
      .get('restrictions.otherText')
      ?.disable({ emitEvent: false });
  }

  private buildAudienceDTO(): AudienceDTO {
    const v = this.audienceForm.getRawValue();
    return {
      allPublic: !!v.allPublic,
      hasAgeRecommendation: !!v.hasAgeRecommendation,
      hasRestriction: !!v.hasRestriction,
      ages: {
        babies: !!v.ages?.babies,
        kids: !!v.ages?.kids,
        teens: !!v.ages?.teens,
        adults: !!v.ages?.adults,
        seniors: !!v.ages?.seniors,
      },
      ageNote: v.ageNote || '',
      restrictions: {
        partnersOnly: !!v.restrictions?.partnersOnly,
        womenOnly: !!v.restrictions?.womenOnly,
        other: !!v.restrictions?.other,
        otherText: v.restrictions?.otherText || '',
      },
    };
  }

  // ------------------------------------------------------
  // Auxiliares
  // ------------------------------------------------------
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
      const curStart = this.formEvent.get('start')?.value || null;
      const curEnd = this.formEvent.get('end')?.value || curStart;
      const curTs = this.formEvent.get('time_start')?.value || '';
      const curTe = this.formEvent.get('time_end')?.value || '';

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

      this.repeatedDates.clear();

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
      if (this.ticketPrices.length === 0) this.addTicketPrice();
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
    if (type === 'inscription')
      this.formEvent.patchValue({ inscription: true });
    else this.formEvent.patchValue({ inscription: false });
  }

  setEventTypeStatus(type: EnumStatusEvent): void {
    this.eventTypeStatus = type;

    const statusReasonRequired = type !== EnumStatusEvent.EJECUCION;

    this.formEvent.patchValue({
      status: type,
      status_reason: '',
    });

    const statusReasonControl = this.formEvent.get('status_reason');
    if (statusReasonRequired) statusReasonControl?.enable();
    else statusReasonControl?.disable();
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
    this.repeatedDates.updateValueAndValidity({ emitEvent: true });
  }

  removeRepeatedDate(index: number): void {
    this.repeatedDates.removeAt(index);
    this.repeatedDates.updateValueAndValidity({ emitEvent: true });
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

  // ------------------------------------------------------
  // Scroll + focus al primer error (de arriba a abajo)
  // ------------------------------------------------------
  private scrollAndFocusFirstError(): void {
    const rootEl = this.el.nativeElement as HTMLElement;

    // 1) Selección de candidatos (tipado explícito)
    const nodeList: NodeListOf<HTMLElement> =
      rootEl.querySelectorAll<HTMLElement>(
        `
    [formControlName].ng-invalid,
    [formArrayName].ng-invalid,
    [formGroupName].ng-invalid,
    .is-invalid,
    [aria-invalid="true"]
    `
      );

    // 2) Filtrar visibles (tipa el callback)
    const visible: HTMLElement[] = Array.from(nodeList).filter(
      (el: HTMLElement) => {
        const style = window.getComputedStyle(el);
        const rect = el.getBoundingClientRect();
        return (
          style.visibility !== 'hidden' &&
          style.display !== 'none' &&
          rect.width > 0 &&
          rect.height > 0
        );
      }
    );

    if (visible.length === 0) return;

    // 3) El más alto (tipa el comparator)
    const target: HTMLElement = visible.sort(
      (a: HTMLElement, b: HTMLElement) =>
        a.getBoundingClientRect().top - b.getBoundingClientRect().top
    )[0];

    this.zone.runOutsideAngular(() => {
      target.scrollIntoView({ behavior: 'smooth', block: 'center' });
      const focusable: HTMLElement | null = target.matches(
        'input,select,textarea,button,[tabindex]'
      )
        ? target
        : target.querySelector<HTMLElement>(
            'input,select,textarea,button,[tabindex]'
          );
      if (focusable) {
        setTimeout(() => focusable.focus({ preventScroll: true }), 250);
      }
    });
  }

  // ------------------------------------------------------
  // Envío
  // ------------------------------------------------------
  onSendFormEvent(): void {
    this.submitted = true;

    const isEmptyOrMidnight = (v?: string | null) =>
      !v || v === '00:00' || v === '00:00:00';

    const isPeriodic = this.eventTypePeriod === 'periodic';
    this.formEvent.patchValue({ periodic: isPeriodic });

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

    // Forzar validación de audience ANTES de decidir
    this.enforceAudienceValidation = true;
    this.audienceForm.markAllAsTouched();
    this.audienceForm.updateValueAndValidity({ emitEvent: false });

    // ¿Hay errores?
    if (this.formEvent.invalid || this.audienceForm.invalid) {
      this.scrollAndFocusFirstError();
      if (this.formEvent.invalid) this.logFormErrors();
      return;
    }

    // ----- Construcción de payload -----
    const rawValues = this.formEvent.getRawValue();

    if (!rawValues.end && rawValues.start) rawValues.end = rawValues.start;

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

    // --- Audience empaquetado
    const audienceDTO = this.buildAudienceDTO();
    (baseData as any).audience = JSON.stringify(audienceDTO);

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
        this.scrollAndFocusFirstError();
        return;
      }

      const seen = new Set<string>();
      const rdNorm = rdRaw
        .map((r) => {
          const d = (r.start || '').slice(0, 10);
          if (!d) return null;
          const e = (r.end && r.end.slice(0, 10)) || d;
          const tStart = this.normTime(r.time_start || '00:00');
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

      const repeated: typeof rdNorm = [];
      for (const r of rdNorm) {
        const key = `${r.start}|${r.time_start}`;
        if (seen.has(key)) continue;
        seen.add(key);
        repeated.push(r);
      }

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
      baseData.repeated_dates = repeated;
    } else {
      baseData.periodic_id = '';
      baseData.repeated_dates = [];
    }

    if (baseData.description)
      baseData.description = baseData.description.replace(/&nbsp;/g, ' ');
    if (baseData.tickets_method)
      baseData.tickets_method = baseData.tickets_method.replace(/&nbsp;/g, ' ');
    if (baseData.inscription_method)
      baseData.inscription_method = baseData.inscription_method.replace(
        /&nbsp;/g,
        ' '
      );
    if (baseData.status_reason)
      baseData.status_reason = baseData.status_reason.replace(/&nbsp;/g, ' ');

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

    this.submitForm.emit({ itemId: this.itemId || 0, formData });
  }

  private logFormErrors(): void {
    const formErrors = this.formEvent.errors;
    if (formErrors) {
      console.warn('Errores generales del formulario:', formErrors);
    }

    Object.entries(this.formEvent.controls).forEach(([key, control]) => {
      if (control.invalid) {
        console.warn(`Campo inválido "${key}":`, (control as any).errors);
      }
    });
  }

  private calcTimeEnd(timeStart: string): string {
    if (!timeStart || !timeStart.includes(':')) return '';
    const [h, m] = timeStart.split(':');
    const hours = parseInt(h, 10);
    const minutes = parseInt(m, 10);
    if (isNaN(hours) || isNaN(minutes)) return '';
    let newHours = hours + 3;
    if (newHours >= 24) newHours -= 24;
    const pad = (n: number) => (n < 10 ? '0' + n : '' + n);
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
      category: CategoryCode[] | [];
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
      audience?: string;
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
    put('category', JSON.stringify(data.category ?? []));
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
    put('audience', data.audience ?? '');

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

    // repeated_dates
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

  selectAudiencePrimary(mode: 'ALL' | 'AGE' | 'RESTRICTION'): void {
    const f = this.audienceForm;

    const resetAges = () =>
      f.get('ages')!.patchValue(
        {
          babies: false,
          kids: false,
          teens: false,
          adults: false,
          seniors: false,
        },
        { emitEvent: false }
      );

    const resetRestrictions = () =>
      f
        .get('restrictions')!
        .patchValue(
          {
            partnersOnly: false,
            womenOnly: false,
            other: false,
            otherText: '',
          },
          { emitEvent: false }
        );

    if (mode === 'ALL') {
      f.patchValue(
        {
          allPublic: true,
          hasAgeRecommendation: false,
          hasRestriction: false,
          ageNote: '',
        },
        { emitEvent: false }
      );
      resetAges();
      resetRestrictions();
      f.get('restrictions.otherText')!.disable({ emitEvent: false });
    }

    if (mode === 'AGE') {
      f.patchValue(
        { allPublic: false, hasAgeRecommendation: true, hasRestriction: false },
        { emitEvent: false }
      );
      resetRestrictions();
      f.get('restrictions.otherText')!.disable({ emitEvent: false });
    }

    if (mode === 'RESTRICTION') {
      f.patchValue(
        {
          allPublic: false,
          hasAgeRecommendation: false,
          hasRestriction: true,
          ageNote: '',
        },
        { emitEvent: false }
      );
      resetAges();
      const other = !!f.get('restrictions.other')!.value;
      const otherText = f.get('restrictions.otherText')!;
      other
        ? otherText.enable({ emitEvent: false })
        : otherText.disable({ emitEvent: false });
      if (!other) otherText.setValue('', { emitEvent: false });
    }
    this.enforceAudienceValidation = true;
    this.audienceForm.updateValueAndValidity({ emitEvent: false });
  }

  /** Toggle seguro para flags dentro de 'ages' y 'restrictions' */
  toggleAudience(path: string): void {
    const c = this.audienceForm.get(path);
    if (!c) return;
    c.setValue(!c.value, { emitEvent: true });
    if (path === 'restrictions.other') {
      const enabled =
        this.audienceForm.get('restrictions.other')!.value === true;
      const otherText = this.audienceForm.get('restrictions.otherText')!;
      enabled
        ? otherText.enable({ emitEvent: false })
        : otherText.disable({ emitEvent: false });
      if (!enabled) otherText.setValue('', { emitEvent: false });
    }
    this.enforceAudienceValidation = true;
    this.audienceForm.updateValueAndValidity({ emitEvent: false });
  }

  toggleRestriction(key: 'partnersOnly' | 'womenOnly' | 'other'): void {
    const grp = this.audienceForm.get('restrictions') as FormGroup;
    if (!grp) return;

    const was = grp.get(key)!.value === true;
    const next = !was;

    grp.setValue(
      { partnersOnly: false, womenOnly: false, other: false, otherText: '' },
      { emitEvent: false }
    );

    grp.patchValue({ [key]: next } as any, { emitEvent: true });

    const otherTextCtrl = grp.get('otherText')!;
    if (key === 'other' && next) {
      otherTextCtrl.enable({ emitEvent: false });
    } else {
      otherTextCtrl.disable({ emitEvent: false });
      otherTextCtrl.setValue('', { emitEvent: false });
    }

    grp.markAsDirty();
    grp.markAsTouched();
    this.enforceAudienceValidation = true;
    this.audienceForm.updateValueAndValidity({ emitEvent: false });

    this.cdr.markForCheck();
  }

  get audienceErrorMessage(): string | null {
    const e = this.audienceForm.errors;
    if (!e) return null;
    if (e['audiencePrimaryConflict'])
      return 'Solo puede haber una opción principal.';
    if (e['audienceRequired']) return 'Selecciona una opción principal.';
    if (e['ageRangeRequired']) return 'Selecciona al menos un rango de edad.';
    if (e['restrictionRequired']) return 'Selecciona al menos una restricción.';
    if (e['restrictionOtherTextRequired'])
      return 'Describe la “Otra restricción”.';
    return 'Completa la sección de Público.';
  }
}
