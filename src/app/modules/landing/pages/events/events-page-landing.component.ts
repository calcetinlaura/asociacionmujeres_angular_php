import { CommonModule } from '@angular/common';
import { Component, computed, inject, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import {
  BehaviorSubject,
  distinctUntilChanged,
  EMPTY,
  map,
  switchMap,
  tap,
} from 'rxjs';

import { EventsFacade } from 'src/app/application/events.facade';
import { ModalFacade } from 'src/app/application/modal.facade';
import { EventModel } from 'src/app/core/interfaces/event.interface';
import { Filter } from 'src/app/core/interfaces/general.interface';
import { TypeActionModal, TypeList } from 'src/app/core/models/general.model';
import { EventsService } from 'src/app/core/services/events.services';
import { GeneralService } from 'src/app/core/services/generalService.service';
import { MacroeventsService } from 'src/app/core/services/macroevents.services';

import { CalendarComponent } from 'src/app/shared/components/calendar/calendar.component';
import { FiltersComponent } from 'src/app/shared/components/filters/filters.component';
import { ModalShellComponent } from 'src/app/shared/components/modal/modal-shell.component';
import { NoResultsComponent } from 'src/app/shared/components/no-results/no-results.component';
import { SectionGenericComponent } from 'src/app/shared/components/section-generic/section-generic.component';
import { SpinnerLoadingComponent } from 'src/app/shared/components/spinner-loading/spinner-loading.component';
import { useEntityList } from 'src/app/shared/hooks/use-entity-list';

@Component({
  selector: 'app-events-page-landing',
  standalone: true,
  imports: [
    CommonModule,
    FiltersComponent,
    SectionGenericComponent,
    SpinnerLoadingComponent,
    NoResultsComponent,
    CalendarComponent,
    ModalShellComponent,
  ],
  templateUrl: './events-page-landing.component.html',
})
export class EventsPageLandingComponent implements OnInit {
  // === Inyecciones ===
  readonly eventsFacade = inject(EventsFacade);
  readonly modalFacade = inject(ModalFacade);
  private readonly eventsService = inject(EventsService);
  private readonly macroeventsService = inject(MacroeventsService);
  private readonly generalService = inject(GeneralService);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);

  // === Estado general ===
  readonly typeList = TypeList;
  readonly TypeActionModal = TypeActionModal;
  readonly isDashboard = false;

  filters: Filter[] = [];
  selectedFilter: string | number = '';
  deepLinkMultiDate: string | null = null;
  currentYear = this.generalService.currentYear;

  private readonly selectedYear$ = new BehaviorSubject<number | null>(null);

  // === Datos base desde la fachada ===
  private readonly allBase$ = this.eventsFacade.allEvents$; // sin agrupar (para calendario)
  private readonly groupedBase$ = this.eventsFacade.groupedEvents$; // agrupados (para secciones)

  // === Derivados ===
  private readonly allForCalendar$ = this.allBase$.pipe(
    map((list) => this.eventsService.sortEventsByDate(list ?? []))
  );

  private readonly groupedForSection$ = this.groupedBase$.pipe(
    map((list) =>
      this.processNonRepeated(list ?? [], this.filterYearForCalendar)
    )
  );

  // === Hooks reutilizables ===
  readonly calendarList = useEntityList<EventModel>({
    filtered$: this.allForCalendar$,
    sort: (arr) => this.eventsService.sortEventsByDate(arr),
    count: (arr) => arr.length,
  });

  readonly sectionList = useEntityList<EventModel>({
    filtered$: this.groupedForSection$,
    map: (arr) => arr,
    sort: (arr) => arr,
    count: (arr) => arr.length,
  });

  readonly upcomingListSig = computed(() =>
    this.sectionList.sortedSig().filter((e) => !e.isPast)
  );
  readonly pastListSig = computed(() =>
    this.sectionList.sortedSig().filter((e) => e.isPast)
  );

  // === Ciclo de vida ===
  ngOnInit(): void {
    this.filters = this.generalService.getYearFilters(
      2018,
      this.currentYear,
      'Agenda'
    );

    const initialId = this.route.snapshot.paramMap.get('id');
    const initialMulti = this.route.snapshot.queryParamMap.get('multiDate');

    if (!initialId && !initialMulti) {
      this.loadEvents(this.currentYear);
    }

    // A) Detectar /events/:id o /macroevents/:id
    this.route.paramMap
      .pipe(
        map((pm) => pm.get('id')),
        distinctUntilChanged(),
        switchMap((id) => {
          if (!id) return EMPTY;
          const numericId = Number(id);
          const path = this.route.snapshot.routeConfig?.path ?? '';
          const isMacro = path.startsWith('macroevents');

          if (isMacro) {
            return this.eventsService.getEventsByMacroevent(numericId).pipe(
              tap((events) => {
                const y = this.pickYearFromMacro(events ?? []);
                if (!isNaN(y) && y && y !== this.selectedFilter) {
                  this.loadEvents(y);
                }
                this.deepLinkMultiDate = null;
              })
            );
          } else {
            return this.eventsService.getEventById(numericId).pipe(
              tap((event) => {
                const y = new Date(event.start).getFullYear();
                if (!isNaN(y) && y !== this.selectedFilter) {
                  this.loadEvents(y);
                }
                this.deepLinkMultiDate = null;
              })
            );
          }
        })
      )
      .subscribe();

    // B) Detectar ?multiDate=YYYY-MM-DD
    this.route.queryParamMap
      .pipe(
        map((q) => q.get('multiDate')),
        distinctUntilChanged()
      )
      .subscribe((md) => {
        this.deepLinkMultiDate = md;
        if (md) {
          const d = new Date(md);
          const y = d.getFullYear();
          if (!isNaN(y) && y !== this.selectedFilter) {
            this.loadEvents(y);
          }
        }
      });
  }

  // === Filtros / UI ===
  get filterYearForCalendar(): number | null {
    const val =
      typeof this.selectedFilter === 'number'
        ? this.selectedFilter
        : Number(this.selectedFilter);
    return Number.isFinite(val) ? (val as number) : null;
  }

  loadEvents(year: number): void {
    this.selectedFilter = year;
    this.selectedYear$.next(year);
    this.eventsFacade.loadYearBundle(year, 'published');
  }

  filterSelected(filter: string): void {
    const year = Number(filter);
    if (!Number.isFinite(year)) return;
    this.deepLinkMultiDate = null;
    this.router.navigate(['/events'], {
      queryParams: { eventId: null, multiDate: null },
      queryParamsHandling: 'merge',
    });
    this.loadEvents(year);
  }

  // === Procesamiento de eventos (divide pasado/futuro) ===
  private processNonRepeated(
    events: EventModel[],
    selectedYear: number | null
  ): EventModel[] {
    const targetYear = Number.isFinite(selectedYear as number)
      ? (selectedYear as number)
      : this.currentYear;

    const todayT = this.truncateTime(new Date()).getTime();

    const flagged = (events ?? []).map((e) => {
      const t = this.truncateTime(new Date(e.start)).getTime();
      const isPast = t < todayT;
      return { ...e, isPast, __t: t } as EventModel & {
        __t: number;
        isPast: boolean;
      };
    });

    if (targetYear === this.currentYear) {
      const future = flagged
        .filter((e) => !e.isPast)
        .sort((a, b) => a.__t - b.__t);
      const past = flagged
        .filter((e) => e.isPast)
        .sort((a, b) => b.__t - a.__t);
      return [...future, ...past].map(({ __t, ...r }) => r);
    } else {
      // Para otros años: orden descendente y sin flag de pasado
      return flagged
        .map((e) => ({ ...e, isPast: false }))
        .sort((a, b) => b.__t - a.__t)
        .map(({ __t, ...r }) => r);
    }
  }

  private truncateTime(d: Date): Date {
    return new Date(d.getFullYear(), d.getMonth(), d.getDate());
  }

  private pickYearFromMacro(events: { start: string }[]): number {
    if (!events?.length) return this.currentYear;
    const today = this.truncateTime(new Date()).getTime();
    const sorted = [...events].sort(
      (a, b) => new Date(a.start).getTime() - new Date(b.start).getTime()
    );
    const future = sorted.find(
      (e) => this.truncateTime(new Date(e.start)).getTime() >= today
    );
    return new Date((future ?? sorted[0]).start).getFullYear();
  }

  // === Apertura de modales centralizada (usando ModalFacade) ===
  onOpenEvent(ev: EventModel | number): void {
    const id = typeof ev === 'number' ? ev : ev.id;
    this.eventsService.getEventById(id).subscribe((event) => {
      this.modalFacade.open(TypeList.Events, TypeActionModal.Show, event);
    });
  }

  onOpenMacroEvent(id: number): void {
    this.macroeventsService.getMacroeventById(id).subscribe((macro) => {
      this.modalFacade.open(TypeList.Macroevents, TypeActionModal.Show, macro);
    });
  }

  onOpenMulti(payload: { date: Date; events: any[] }): void {
    this.modalFacade.open(TypeList.MultiEvents, TypeActionModal.Show, payload);
  }
}
