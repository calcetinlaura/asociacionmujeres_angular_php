import { CommonModule } from '@angular/common';
import {
  ChangeDetectorRef,
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
  debounceTime,
  filter,
  forkJoin,
  map,
  Observable,
  of,
  switchMap,
  take,
  tap,
} from 'rxjs';
import { AgentsFacade } from 'src/app/application/agents.facade';
import { EventsFacade } from 'src/app/application/events.facade';
import { MacroeventsFacade } from 'src/app/application/macroevents.facade';
import { PlacesFacade } from 'src/app/application/places.facade';
import { ProjectsFacade } from 'src/app/application/projects.facade';
import { AgentModel } from 'src/app/core/interfaces/agent.interface';
import {
  AudienceDTO,
  CATEGORY_LIST,
  CATEGORY_UI,
  CategoryCode,
  DayEventModel,
  EnumStatusEvent,
  EventModelFullData,
  ParkingValue,
  statusEvent,
} from 'src/app/core/interfaces/event.interface';
import { MacroeventModel } from 'src/app/core/interfaces/macroevent.interface';
import { PlaceModel, SalaModel } from 'src/app/core/interfaces/place.interface';
import { ProjectModel } from 'src/app/core/interfaces/project.interface';
import { TypeList } from 'src/app/core/models/general.model';
import { FormErrorNavigatorService } from 'src/app/core/services/form-error-navigator.service';
import { GeneralService } from 'src/app/core/services/generalService.service';
import { ButtonCategoryComponent } from 'src/app/shared/components/buttons/button-category/button-category.component';
import { ButtonIconComponent } from 'src/app/shared/components/buttons/button-icon/button-icon.component';
import { ButtonSelectComponent } from 'src/app/shared/components/buttons/button-select/button-select.component';
import { ImageControlComponent } from 'src/app/shared/components/image-control/image-control.component';
import { SpinnerLoadingComponent } from 'src/app/shared/components/spinner-loading/spinner-loading.component';
import { ScrollToFirstErrorDirective } from 'src/app/shared/directives/scroll-to-first-error.directive';
import { FilterTransformCodePipe } from 'src/app/shared/pipe/filterTransformCode.pipe';
import { SocialNetwork } from 'src/app/shared/utils/social.utils';
import {
  dateBetween,
  dateRangeValidator,
  periodicHasMultipleDatesValidator,
  timeRangeValidator,
  uniqueDateTimeValidator,
} from 'src/app/shared/utils/validators.utils';
import { AgentArrayControlComponent } from '../array-agents/array-agents.component';
import { DateArrayControlComponent } from '../array-dates/array-dates.component';
import { LinkItemComponent } from '../link-item/link-item.components';
// ------------------------------------------------------
// Helpers mínimos
// ------------------------------------------------------
const arrayNotEmpty: ValidatorFn = (
  control: AbstractControl<any, any>
): ValidationErrors | null => {
  const v = control.value as unknown;
  const arr = Array.isArray(v) ? (v as unknown[]) : [];
  return arr.length > 0 ? null : { required: true };
};

/** Aplica un validador solo si el evento NO es periódico */
function singleOnly(v: ValidatorFn): ValidatorFn {
  return (fg: AbstractControl) => (fg.get('periodic')?.value ? null : v(fg));
}

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
    ScrollToFirstErrorDirective,
    LinkItemComponent,
  ],
  templateUrl: './form-event.component.html',
  styleUrls: ['./../../../../../../shared/components/form/form.component.css'],
})
export class FormEventComponent implements OnInit, OnChanges {
  private readonly destroyRef = inject(DestroyRef);
  readonly eventsFacade = inject(EventsFacade);
  readonly macroeventsFacade = inject(MacroeventsFacade);
  private readonly placesFacade = inject(PlacesFacade);
  private readonly projectsFacade = inject(ProjectsFacade);
  private readonly agentsFacade = inject(AgentsFacade);
  private readonly generalService = inject(GeneralService);
  private readonly fb = inject(FormBuilder);
  private readonly cdr = inject(ChangeDetectorRef);
  private readonly formErrorNav = inject(FormErrorNavigatorService);

  readonly minDate = new Date(2018, 0, 1);
  readonly maxDate = (() => {
    const nextYear = new Date().getFullYear() + 1;
    return new Date(nextYear, 11, 31, 0, 0, 0, 0);
  })();
  @Input() modalKey: number = 0;
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
  eventTypeUbication: 'PLACE' | 'ONLINE' | 'PENDING' = 'PENDING';
  eventTypeAccess: 'FREE' | 'TICKETS' | 'UNSPECIFIED' = 'UNSPECIFIED';
  eventTypeStatus: EnumStatusEvent = EnumStatusEvent.EJECUCION;
  eventTypeInscription: 'UNLIMITED' | 'INSCRIPTION' = 'UNLIMITED';

  // ------------------------------------------------------
  // Formulario principal
  // ------------------------------------------------------
  formEvent = new FormGroup(
    {
      title: new FormControl<string>('', [Validators.required]),
      start: new FormControl<string | null>(null, [
        Validators.required,
        dateBetween(this.minDate, this.maxDate),
      ]),
      end: new FormControl<string | null>(null, [
        dateBetween(this.minDate, this.maxDate),
      ]),
      time_start: new FormControl<string | null>(null),
      time_end: new FormControl<string | null>(null),
      category: new FormControl<CategoryCode[]>([], {
        nonNullable: true,
        validators: [arrayNotEmpty],
      }),
      description: new FormControl<string>('', [Validators.maxLength(2000)]),
      summary: new FormControl<string>('', [Validators.maxLength(300)]),
      online_link: new FormControl<string>(''),
      online_title: new FormControl<string>(''),
      province: new FormControl<string>(''),
      town: new FormControl<string>(''),
      place_id: new FormControl<number | null>(null),
      sala_id: new FormControl<number | null>(null),
      capacity: new FormControl<number | null>(null),
      access: new FormControl<'FREE' | 'TICKETS' | 'UNSPECIFIED'>(
        'UNSPECIFIED'
      ),
      ticket_prices: new FormArray<FormGroup>([]),
      tickets_method: new FormControl<string>(''),
      periodic: new FormControl<boolean>(false),
      periodic_id: new FormControl<string>(''),
      repeated_dates: new FormArray<FormGroup>([], {
        validators: [uniqueDateTimeValidator],
      }),
      img: new FormControl<string>(''),
      status: new FormControl<EnumStatusEvent>(EnumStatusEvent.EJECUCION),
      status_reason: new FormControl<string>(''),
      inscription: new FormControl<boolean>(false),
      inscription_method: new FormControl<string>(''),
      organizer: new FormArray<FormGroup>([]),
      collaborator: new FormArray<FormGroup>([]),
      sponsor: new FormArray<FormGroup>([]),
      macroevent_id: new FormControl<number | null>({
        value: null,
        disabled: true,
      } as any),
      project_id: new FormControl<number | null>({
        value: null,
        disabled: true,
      } as any),
      open_doors: new FormControl<string | null>(null),
      parking: new FormControl<ParkingValue>(''),
      parking_info: new FormControl<string>('', { nonNullable: true }),
      // FAQs
      faqs: this.fb.array<FormGroup>([]),
      // Publicación (en raíz)
      published: new FormControl<boolean>(false, { nonNullable: true }),
      publish_day: new FormControl<string | null>(null),
      publish_time: new FormControl<string | null>(null),
      // Comunicación (en raíz)
      websites: this.fb.array<FormGroup>([]),
      videos: this.fb.array<FormGroup>([]),
      socials: this.fb.array<FormGroup>([]),
    },
    {
      validators: [
        singleOnly(dateRangeValidator),
        singleOnly(timeRangeValidator),
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

  quillModules = this.generalService.defaultQuillModules;

  private originalIdForDuplicate: number | null = null;

  // ------------------------------------------------------
  // Ciclo de vida
  // ------------------------------------------------------
  ngOnInit(): void {
    // ---- Suscripciones del audience (coherencia automática de flags)
    // ALL PUBLIC
    this.audienceForm
      .get('allPublic')!
      .valueChanges.pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((v: boolean) => {
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
            { hasAgeRecommendation: false, hasRestriction: false },
            { emitEvent: false }
          );
          this.audienceForm
            .get('restrictions.otherText')!
            .disable({ emitEvent: false });
        }
        this.enforceAudienceValidation = true;
        this.audienceForm.updateValueAndValidity({ emitEvent: false });
      });

    // AGES
    this.audienceForm
      .get('ages')!
      .valueChanges.pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((ages) => {
        const anyAge = Object.values(ages as Record<string, boolean>).some(
          Boolean
        );
        const patch: any = { allPublic: false, hasAgeRecommendation: anyAge };
        if (anyAge) patch.hasRestriction = false;
        this.audienceForm.patchValue(patch, { emitEvent: false });

        this.enforceAudienceValidation = true;
        this.audienceForm.updateValueAndValidity({ emitEvent: false });
      });

    // RESTRICTIONS (grupo completo)
    this.audienceForm
      .get('restrictions')!
      .valueChanges.pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((r: any) => {
        const anyR = !!r?.partnersOnly || !!r?.womenOnly || !!r?.other;

        const otherText = this.audienceForm.get('restrictions.otherText')!;
        if (r?.other) {
          otherText.enable({ emitEvent: false });
        } else {
          otherText.disable({ emitEvent: false });
          otherText.setValue('', { emitEvent: false });
        }

        const patch: any = { allPublic: false, hasRestriction: anyR };
        if (anyR) patch.hasAgeRecommendation = false;
        this.audienceForm.patchValue(patch, { emitEvent: false });

        this.enforceAudienceValidation = true;
        this.audienceForm.updateValueAndValidity({ emitEvent: false });
      });

    // ---- Carga inicial/duplicado
    if (this.itemId === 0 || !this.itemId) {
      if (this.item) {
        this.populateFormWithEvent(this.item).subscribe(() => {});
      } else {
        this.formEvent.reset();
        // audience reset también
        this.resetAudienceForm();
        this.titleForm = 'Registrar evento';
        this.buttonAction = 'Guardar';
        this.setEventTypePeriod('single');

        // aplicar borrador si existe (solo CREATE)
        this.eventsFacade.draftEvent$.pipe(take(1)).subscribe((draft) => {
          if (draft) this.applyDraft(draft);
        });
      }
    }

    this.provincias = townsData
      .flatMap((region) => region.provinces)
      .sort((a, b) => a.label.localeCompare(b.label));

    this.agentsFacade.loadAllAgents();

    // Escucha la lista filtrada (o usa agents$ si prefieres sin filtros)
    this.agentsFacade.filteredAgents$
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        tap((agents) => (this.agents = agents ?? []))
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
    console.log('%c[FormEventComponent] ngOnChanges', 'color:orange', changes);

    if (changes['modalKey']) {
      console.log(
        '[ngOnChanges] modalKey changed',
        changes['modalKey'].currentValue
      );
      // Se ha reabierto el formulario, forzamos limpieza
      this.formEvent.reset();
      this.resetAudienceForm(); // si tienes públicos, precios, fechas extra
    }

    if (changes['item'] && changes['item'].currentValue) {
      const incoming = changes['item'].currentValue as EventModelFullData;
      console.log('[ngOnChanges] item changed, hydrating form with:', incoming);
      // Solo hidratamos si hay datos válidos
      if (incoming && incoming.id) {
        this.populateFormWithEvent(incoming).subscribe();
      }
    }

    if (changes['itemId'] && changes['itemId'].currentValue) {
      const newId = changes['itemId'].currentValue;
      console.log('[ngOnChanges] itemId changed:', newId);
      // Carga desde la fachada si viene sólo un ID
      if (newId !== 0) {
        this.loadEventData(newId);
      }
    }
    if (changes['item']?.currentValue && changes['item']?.previousValue) {
      const prevId = changes['item'].previousValue?.id;
      const currId = changes['item'].currentValue?.id;
      if (prevId === currId) {
        // mismo item; evita rehidratar
        return;
      }
    }
  }
  // 👉 Hidrata agentes (organizer, collaborator, sponsor) sin duplicar
  hydrateAgentsFromEvent(event: any): void {
    const orgs = this.uniqById(event.organizer);
    const cols = this.uniqById(event.collaborator);
    const spons = this.uniqById(event.sponsor);

    // 🧹 Limpia los FormArray antes de agregar los nuevos valores
    this.organizers.clear();
    this.collaborators.clear();
    this.sponsors.clear();

    // 🎯 Controla visibilidad (por si usas *ngIf en el HTML)
    this.showOrganizers = orgs.length > 0;
    this.showCollaborators = cols.length > 0;
    this.showSponsors = spons.length > 0;

    // ➕ Agrega agentes únicos
    orgs.forEach((a) => this.organizers.push(this.createAgentForm(a.id)));
    cols.forEach((a) => this.collaborators.push(this.createAgentForm(a.id)));
    spons.forEach((a) => this.sponsors.push(this.createAgentForm(a.id)));
  }
  private hydrateCommunications(event: any): void {
    // 🔧 Parsear campos que vienen como string JSON
    const websitesRaw =
      typeof event.websites === 'string'
        ? JSON.parse(event.websites || '[]')
        : event.websites ?? [];
    const videosRaw =
      typeof event.videos === 'string'
        ? JSON.parse(event.videos || '[]')
        : event.videos ?? [];
    const socialsRaw =
      typeof event.socials === 'string'
        ? JSON.parse(event.socials || '[]')
        : event.socials ?? [];
    const faqsRaw =
      typeof event.faqs === 'string'
        ? JSON.parse(event.faqs || '[]')
        : event.faqs ?? [];

    // Websites
    this.websites.clear();
    websitesRaw.forEach((w: any) => {
      this.websites.push(this.createWebsite(w.url, w.title));
    });

    // Videos
    this.videos.clear();
    videosRaw.forEach((v: any) => {
      this.videos.push(this.createVideo(v.url, v.title));
    });

    // Socials
    this.socials.clear();
    socialsRaw.forEach((s: any) => {
      this.socials.push(this.createSocial(s.network, s.url));
    });

    // FAQs
    this.faqs.clear();
    faqsRaw.forEach((f: any) => {
      this.faqs.push(this.createFaqItem(f.q, f.a));
    });
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
  setParking(p: Exclude<ParkingValue, ''>) {
    this.formEvent.get('parking')?.setValue(p);
  } /** Estado UI para secciones */

  get openDoorsEnabled(): boolean {
    return !!this.formEvent.get('open_doors')?.value;
  }
  get parkingEnabled(): boolean {
    return !!this.formEvent.get('parking')?.value;
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
  get onlineLinkCtrl(): FormControl<string | null> {
    return this.formEvent.get('online_link') as FormControl<string | null>;
  }
  get onlineTitleCtrl(): FormControl<string | null> {
    return this.formEvent.get('online_title') as FormControl<string | null>;
  }
  descriptionLen(): number {
    return (this.formEvent.get('summary')?.value || '').length;
  }
  summaryLen(): number {
    return (this.formEvent.get('summary')?.value || '').length;
  }
  get faqs(): FormArray {
    return this.formEvent.get('faqs') as FormArray;
  }
  get websites(): FormArray {
    return this.formEvent.get('websites') as FormArray;
  }
  get videos(): FormArray {
    return this.formEvent.get('videos') as FormArray;
  }
  get socials(): FormArray {
    return this.formEvent.get('socials') as FormArray;
  }

  // Publicación
  get isDraft(): boolean {
    return !(this.formEvent.get('published')?.value ?? false);
  }
  get isPublishNow(): boolean {
    const pub = !!this.formEvent.get('published')?.value;
    const hasDate = !!this.formEvent.get('publish_day')?.value;
    return pub && !hasDate;
  }
  get isScheduled(): boolean {
    return (
      !!this.formEvent.get('published')?.value &&
      !!this.formEvent.get('publish_day')?.value
    );
  }
  // ------------------------------------------------------
  // Carga e hidratación
  // ------------------------------------------------------
  private loadEventData(eventId: number | string): void {
    const id = Number(eventId);

    this.eventsFacade.clearSelectedEvent();
    this.eventsFacade.loadEventById(id);

    this.eventsFacade.selectedEvent$
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        filter((e): e is EventModelFullData => !!e && e.id === id),
        // Coalesce: nos quedamos con la última emisión tras un pequeño silencio.
        // Así “ganará” la respuesta del servidor si llega después del cache.
        // Puedes usar 250–500ms según tu backend.
        // IMPORTANTE: importa debounceTime de 'rxjs'
        debounceTime(300),
        switchMap((event) => this.populateFormWithEvent(event))
      )
      .subscribe();
  }

  private populateFormWithEvent(event: EventModelFullData): Observable<void> {
    this.resetFormState();
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
        console.log('🔍 Datos de comunicación al editar:', {
          websites: event.websites,
          videos: event.videos,
          socials: event.socials,
          faqs: event.faqs,
        });
        this.formEvent.patchValue(
          {
            title: event.title,
            start: event.start,
            end: event.end,
            time_start: event.time_start,
            time_end: event.time_end,
            description: event.description,
            summary: event.summary,
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
            online_title: event.online_title ?? '',
            periodic: event.periodic ?? false,
            periodic_id: event.periodic_id ?? '',
            open_doors: event.open_doors ?? '',
            published: event.published ?? false,
            publish_day: event.publish_day ?? null,
            publish_time: event.publish_time ?? null,
            parking: event.parking ?? '',
            parking_info: event.parking_info ?? '',
          },
          { emitEvent: false }
        );
        // limpia primero
        this.categoryCtrl.setValue([], { emitEvent: false });
        this.cdr.detectChanges(); // fuerza que los hijos pinten todo como inactivo

        // y ahora pon la nueva del back (normalizada)
        const normalized = this.normalizeCategory(event.category).filter((c) =>
          this.category_list.some((k) => k.code === c)
        ); // filtra códigos desconocidos

        this.categoryCtrl.setValue([...normalized], { emitEvent: true });
        this.categoryCtrl.updateValueAndValidity({ emitEvent: false });
        this.cdr.detectChanges();
        this.eventTypePeriod = event.periodic ? 'periodic' : 'single';
        if (event.macroevent_id) this.eventTypeMacro = 'MACRO';
        if (event.project_id) this.eventTypeProject = 'PROJECT';
        if (event.place_id) this.eventTypeUbication = 'PLACE';
        else if (event.online_link) this.eventTypeUbication = 'ONLINE';
        else this.eventTypeUbication = 'PENDING';

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
          ? 'INSCRIPTION'
          : 'UNLIMITED';

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

        if (event.place_id != null) {
          // descarta null y undefined
          const placeId = event.place_id; // number
          const selectedSalaId = event.sala_id ?? undefined; // number | undefined

          this.placesFacade
            .loadSalasForPlace(placeId, selectedSalaId)
            .pipe(
              takeUntilDestroyed(this.destroyRef),
              tap(({ salas, selectedSala }) => {
                this.salasDelLugar = salas;
                this.formEvent.patchValue(
                  {
                    sala_id: selectedSala?.sala_id ?? null,
                    capacity: selectedSala?.capacity ?? null,
                  },
                  { emitEvent: false }
                );
              })
            )
            .subscribe();
        }

        this.onTownChange();
        this.titleForm =
          this.itemId === 0 ? 'Duplicar evento' : 'Editar Evento';
        this.buttonAction = this.itemId === 0 ? 'Duplicar' : 'Guardar cambios';

        if (event.img) {
          this.imageSrc = event.img;
          this.selectedImageFile = null;
        }
        this.hydrateAgentsFromEvent(event);
        this.hydrateCommunications(event);
        this.hydrateAudience(event);
      }),
      map(() => void 0)
    );
  }

  private hydrateAudience(event?: Partial<EventModelFullData>): void {
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

  loadMacroeventosByYear(year: number): void {
    this.macroeventsFacade.loadMacroeventsByYear(year);
  }

  private loadProjectsByYear(year: number): Observable<void> {
    // Llamamos a la facade para que haga la carga
    this.projectsFacade.loadProjectsByYear(year);

    // Nos suscribimos una sola vez a la lista de proyectos cargados
    return this.projectsFacade.filteredProjects$.pipe(
      filter((projects): projects is ProjectModel[] => Array.isArray(projects)),
      tap((projects) => {
        this.projects = projects;
      }),
      takeUntilDestroyed(this.destroyRef),
      map(() => void 0)
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
      this.formEvent.get('img')?.setValue(null as any);
      return;
    }
    const result = await this.generalService.handleFileSelection(file);
    this.selectedImageFile = result.file;
    this.imageSrc = result.imageSrc;
  }
  setDraft(): void {
    this.formEvent.patchValue({
      published: false,
      publish_day: null,
      publish_time: null,
    });
  }

  publishNow(): void {
    this.formEvent.patchValue({
      published: true,
      publish_day: null,
      publish_time: null,
    });
  }
  private todayISO(): string {
    const d = new Date();
    const yyyy = d.getFullYear();
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const dd = String(d.getDate()).padStart(2, '0');
    return `${yyyy}-${mm}-${dd}`;
  } // FAQs / Websites / Vídeos / Redes
  private faqItemValidator: ValidatorFn = (fg: AbstractControl) => {
    const q = (fg.get('q')?.value || '').toString().trim();
    const a = (fg.get('a')?.value || '').toString().trim();
    const errs: ValidationErrors = {};
    if (!q) errs['qRequired'] = true;
    if (!a) errs['aRequired'] = true;
    if (a && a.length > 300) errs['aTooLong'] = true;
    return Object.keys(errs).length ? errs : null;
  };

  createFaqItem(q = '', a = ''): FormGroup {
    return this.fb.group(
      { q: [q], a: [a] },
      { validators: [this.faqItemValidator] }
    );
  }
  addFaq(): void {
    this.faqs.push(this.createFaqItem());
  }
  clearFaqs(): void {
    this.faqs.clear();
  }
  removeFaq(i: number): void {
    this.faqs.removeAt(i);
  }
  private urlValidator: ValidatorFn = (c) =>
    !c.value || /^https?:\/\/.+/i.test(String(c.value).trim())
      ? null
      : { url: true };
  createWebsite(url = '', title = ''): FormGroup {
    return this.fb.group({ url: [url, [this.urlValidator]], title: [title] });
  }
  addWebsite(): void {
    this.websites.push(this.createWebsite());
  }
  removeWebsite(i: number): void {
    this.websites.removeAt(i);
  }

  createVideo(url = '', title = ''): FormGroup {
    return this.fb.group({ url: [url, [this.urlValidator]], title: [title] });
  }
  addVideo(): void {
    this.videos.push(this.createVideo());
  }
  removeVideo(i: number): void {
    this.videos.removeAt(i);
  }

  createSocial(network: SocialNetwork = 'instagram', url = ''): FormGroup {
    return this.fb.group({
      network: [network],
      url: [url, [this.urlValidator]],
    });
  }
  addSocial(): void {
    this.socials.push(this.createSocial());
  }
  removeSocial(i: number): void {
    this.socials.removeAt(i);
  }
  /** Activa “Programar publicación” dando valores por defecto si no existen */
  schedulePublication(): void {
    const day = this.formEvent.get('publish_day')?.value;
    const time = this.formEvent.get('publish_time')?.value;
    this.formEvent.patchValue({
      published: true,
      publish_day: day || this.todayISO(),
      publish_time: time || '09:00',
    });
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

  setEventTypeUbication(type: 'PLACE' | 'ONLINE' | 'PENDING'): void {
    this.eventTypeUbication = type;
    const onlineLinkControl = this.formEvent.get('online_link')!;

    if (type === 'ONLINE') {
      this.formEvent.patchValue(
        {
          province: '',
          town: '',
          place_id: null,
          sala_id: null,
          capacity: null,
        },
        { emitEvent: false }
      );

      onlineLinkControl.setValidators([
        Validators.required,
        Validators.pattern(/^https?:\/\/.+$/),
      ]);
    } else {
      onlineLinkControl.clearValidators();
      onlineLinkControl.setValue('', { emitEvent: false });
    }
    onlineLinkControl.updateValueAndValidity({ emitEvent: false });
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

  setEventTypeInscription(type: 'UNLIMITED' | 'INSCRIPTION'): void {
    this.eventTypeInscription = type;
    if (type === 'INSCRIPTION')
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
  // ---------- Info útil: acciones ----------
  private subtractMinutesFromHHMM(hhmm: string, minutes: number): string {
    const [hStr, mStr] = hhmm.split(':');
    let total = +hStr * 60 + +mStr - minutes;
    const DAY = 24 * 60;
    total = ((total % DAY) + DAY) % DAY; // normaliza por si cruza medianoche
    const h = Math.floor(total / 60);
    const m = total % 60;
    return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
  }

  addDoorsOpen(): void {
    this.formEvent.patchValue({ open_doors: '00:00' });
  }
  removeDoorsOpen(): void {
    this.formEvent.patchValue({ open_doors: null });
  }

  addParking(): void {
    if (!this.formEvent.get('parking')?.value)
      this.formEvent.patchValue({ parking: 'FREE' });
  }
  removeParking(): void {
    this.formEvent.patchValue({
      parking: '',
      parking_info: '',
    });
  }
  /** Estado UI para secciones */

  /** Toggles (usan tus add/remove existentes) */
  toggleDoorsOpen(): void {
    this.openDoorsEnabled ? this.removeDoorsOpen() : this.addDoorsOpen();
  }

  toggleParking(): void {
    this.parkingEnabled ? this.removeParking() : this.addParking();
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
      if (this.formEvent.invalid) this.logFormErrors();
      // 👇 scroll manual si solo Público está inválido
      this.formErrorNav.scrollToFirstError(document.body, {
        offset: 100,
        focus: false,
      });
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
      faqs: this.faqs.getRawValue(), // [{q,a}]
      websites: this.websites.getRawValue(), // [{url,title}]
      videos: this.videos
        .getRawValue()
        .map((v: any) => ({ url: v.url, title: v.title ?? v.label ?? '' })), // ver patch 2
      socials: this.socials.getRawValue(), // [{network,url}]
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
      summary?: string;
      online_title?: string;
      open_doors?: string | null;
      parking?: ParkingValue;
      parking_info?: string;
      faqs?: Array<{ q: string; a: string }>;
      websites?: Array<{ url: string; title?: string }>;
      videos?: Array<{ url: string; title?: string }>;
      socials?: Array<{ network: SocialNetwork; url: string }>;
      // Publicación
      published?: boolean;
      publish_day?: string | null;
      publish_time?: string | null;
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

    // Campos simples (normaliza HH:mm a HH:mm:ss)
    put('title', data.title ?? '');
    put('start', data.start ?? '');
    put('end', data.end ?? '');
    put('time_start', this.normTime(data.time_start ?? ''));
    put('time_end', this.normTime(data.time_end ?? ''));
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
    put('summary', data.summary ?? '');
    put('online_title', data.online_title ?? '');
    put('open_doors', this.normTime(data.open_doors ?? '')); // '' si no hay
    put('parking', data.parking ?? '');
    put('parking_info', data.parking_info ?? '');

    // Publicación (separado como pediste)
    put('published', !!data.published);
    put('publish_day', data.publish_day ?? '');
    put('publish_time', this.normTime(data.publish_time ?? ''));

    // Arrays JSON (más simple y robusto para PHP)
    fd.append('faqs', JSON.stringify(data.faqs ?? []));
    fd.append('websites', JSON.stringify(data.websites ?? []));
    fd.append('videos', JSON.stringify(data.videos ?? []));
    fd.append('socials', JSON.stringify(data.socials ?? []));
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
      f.get('restrictions')!.patchValue(
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
    grp.setValue(
      { partnersOnly: false, womenOnly: false, other: false, otherText: '' },
      { emitEvent: false }
    );
    grp.patchValue({ [key]: !was } as any, { emitEvent: true });
    // El valueChanges del grupo ya se ocupa de hasRestriction y otherText
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

  private applyDraft(draft: Partial<EventModelFullData>): void {
    // Forzamos modo "single"
    this.setEventTypePeriod('single');

    // Fecha del draft → dispara la carga anual por tu suscripción a 'start'
    if (draft.start) {
      const startIso = draft.start.slice(0, 10);
      this.formEvent.patchValue({ start: startIso }, { emitEvent: true });

      const year = this.generalService.getYearFromDate(startIso);

      this.loadYearlyData(year).pipe(take(1)).subscribe();
      this.generalService.enableInputControls(this.formEvent, [
        'project_id',
        'macroevent_id',
      ]);
    }

    // Hora opcional
    if (draft.time_start) {
      this.formEvent.patchValue(
        { time_start: draft.time_start },
        { emitEvent: false }
      );
    }

    // Limpia el draft tras usarlo
    this.eventsFacade.clearDraft();
    this.cdr.markForCheck();
  }
  normalizeCategory(input: unknown): CategoryCode[] {
    const valid = new Set(this.category_list.map((c) => String(c.code)));
    const toCode = (x: unknown) => String(x).trim();

    if (Array.isArray(input)) {
      return input.map(toCode).filter((c) => valid.has(c)) as CategoryCode[];
    }
    if (typeof input === 'string') {
      const s = input.trim();
      if (!s) return [];
      try {
        const parsed = JSON.parse(s);
        return Array.isArray(parsed)
          ? (parsed.map(toCode).filter((c) => valid.has(c)) as CategoryCode[])
          : valid.has(s)
          ? [s as CategoryCode]
          : [];
      } catch {
        return valid.has(s) ? [s as CategoryCode] : [];
      }
    }
    return [];
  }
  private resetFormState(): void {
    // Controles simples
    this.formEvent.patchValue(
      {
        title: '',
        start: null,
        end: null,
        time_start: null,
        time_end: null,
        category: [],
        description: '',
        online_link: '',
        province: '',
        town: '',
        place_id: null,
        sala_id: null,
        capacity: null,
        access: 'UNSPECIFIED',
        tickets_method: '',
        periodic: false,
        periodic_id: '',
        img: '',
        status: EnumStatusEvent.EJECUCION,
        status_reason: '',
        inscription: false,
        inscription_method: '',
        macroevent_id: null,
        project_id: null,
      },
      { emitEvent: false }
    );

    // Arrays
    this.organizers.clear();
    this.collaborators.clear();
    this.sponsors.clear();
    this.ticketPrices.clear();
    this.repeatedDates.clear();

    // UI flags
    this.showOrganizers = false;
    this.showCollaborators = false;
    this.showSponsors = false;

    // Público
    this.resetAudienceForm();

    this.cdr.detectChanges();
  }
}
