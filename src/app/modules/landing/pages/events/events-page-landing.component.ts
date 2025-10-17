import { CommonModule } from '@angular/common';
import { Component, computed, inject, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import {
  BehaviorSubject,
  combineLatest,
  distinctUntilChanged,
  EMPTY,
  map,
  switchMap,
  tap,
} from 'rxjs';
import { EventsFacade } from 'src/app/application/events.facade';
import { EventModel } from 'src/app/core/interfaces/event.interface';
import {
  Filter,
  TypeActionModal,
  TypeList,
} from 'src/app/core/models/general.model';
import { EventsService } from 'src/app/core/services/events.services';
import { MacroeventsService } from 'src/app/core/services/macroevents.services';
import { FiltersComponent } from 'src/app/modules/landing/components/filters/filters.component';
import { NoResultsComponent } from 'src/app/modules/landing/components/no-results/no-results.component';
import { SectionGenericComponent } from 'src/app/modules/landing/components/section-generic/section-generic.component';
import { ModalShellComponent } from 'src/app/shared/components/modal/modal-shell.component';
import { ModalNavService } from 'src/app/shared/components/modal/services/modal-nav.service';
import { SpinnerLoadingComponent } from 'src/app/shared/components/spinner-loading/spinner-loading.component';
import { useEntityList } from 'src/app/shared/hooks/use-entity-list';
import { GeneralService } from 'src/app/shared/services/generalService.service';
import { CalendarComponent } from '../../../../shared/components/calendar/calendar.component';

@Component({
  selector: 'app-events-page-landing',
  standalone: true,
  imports: [
    CommonModule,
    FiltersComponent,
    SectionGenericComponent,
    NoResultsComponent,
    SpinnerLoadingComponent,
    CalendarComponent,
    ModalShellComponent,
  ],
  templateUrl: './events-page-landing.component.html',
  styleUrls: ['./events-page-landing.component.css'],
})
export class EventsPageLandingComponent implements OnInit {
  // ─── Inyecciones ──────────────────────────────────────────────
  readonly eventsFacade = inject(EventsFacade);
  private readonly eventsService = inject(EventsService);
  private readonly macroeventsService = inject(MacroeventsService);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly generalService = inject(GeneralService);
  readonly modalNav = inject(ModalNavService<any>);

  // ─── Estado general ───────────────────────────────────────────
  filters: Filter[] = [];
  typeList = TypeList;
  selectedFilter: string | number = '';
  currentYear = this.generalService.currentYear;
  isDashboard = false;
  deepLinkMultiDate: string | null = null;

  // Modal
  isModalVisible = false;
  item: any = null;
  currentModalAction: TypeActionModal = TypeActionModal.Show;
  typeModal: TypeList = TypeList.Events;
  private openedWithNavigation = false;
  private selectedYear$ = new BehaviorSubject<number | null>(null);

  // ─── Bases desde la fachada ───────────────────────────────────
  private readonly allBase$ = this.eventsFacade.eventsAll$;
  private readonly latestBase$ = this.eventsFacade.eventsNonRepeteatedSubject$;

  // ─── Filtros de año ───────────────────────────────────────────
  private filterByYear(
    events: EventModel[] = [],
    year: number | null
  ): EventModel[] {
    if (!year) return events;
    return events.filter((e: any) => {
      const s = e?.start ? String(e.start).slice(0, 10) : '';
      const end = e?.end ? String(e.end).slice(0, 10) : s;
      if (!s) return false;
      const sy = Number(s.slice(0, 4));
      const ey = Number(end.slice(0, 4));
      return sy <= year && year <= ey;
    });
  }

  private readonly allByYear$ = combineLatest([
    this.allBase$,
    this.selectedYear$,
  ]).pipe(
    map(([list, year]) =>
      this.filterByYear(this.eventsService.sortEventsByDate(list ?? []), year)
    )
  );

  private readonly latestByYear$ = combineLatest([
    this.latestBase$,
    this.selectedYear$,
  ]).pipe(
    map(([list, year]) =>
      this.filterByYear(this.eventsService.sortEventsByDate(list ?? []), year)
    )
  );

  // ─── Listas derivadas ─────────────────────────────────────────
  readonly calendarList = useEntityList<EventModel>({
    filtered$: this.allByYear$,
    sort: (arr) => this.eventsService.sortEventsByDate(arr),
    count: (arr) => arr.length,
  });

  readonly sectionList = useEntityList<EventModel>({
    filtered$: this.latestByYear$,
    map: (arr) => this.processNonRepeated(arr, this.filterYearForCalendar),
    sort: (arr) => arr,
    count: (arr) => arr.length,
  });

  readonly upcomingListSig = computed(() =>
    this.sectionList.sortedSig().filter((e) => !e.isPast)
  );
  readonly pastListSig = computed(() =>
    this.sectionList.sortedSig().filter((e) => e.isPast)
  );

  // ─── Ciclo de vida ────────────────────────────────────────────
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

    // --- A) Detectar /events/:id o /macroevents/:id ---
    this.route.paramMap
      .pipe(
        map((pm) => pm.get('id')),
        distinctUntilChanged(),
        switchMap((id) => {
          if (!id) return EMPTY;
          const numericId = Number(id);
          const routePath = this.route.snapshot.routeConfig?.path ?? '';
          const isMacro = routePath.startsWith('macroevents');

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

    // --- B) Detectar ?multiDate=YYYY-MM-DD ---
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

  // ─── Filtros ─────────────────────────────────────────────────
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
    this.eventsFacade.loadYearBundle(year);
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

  // ─── Helpers ─────────────────────────────────────────────────
  private processNonRepeated(
    events: EventModel[],
    selectedYear: number | null
  ): EventModel[] {
    const targetYear = Number.isFinite(selectedYear as number)
      ? (selectedYear as number)
      : this.currentYear;

    if (targetYear === this.currentYear) {
      const todayT = this.truncateTime(new Date()).getTime();
      const flagged = (events ?? []).map((e) => {
        const t = this.truncateTime(new Date(e.start)).getTime();
        const isPast = t < todayT;
        return { ...e, isPast, __t: t } as EventModel & {
          __t: number;
          isPast: boolean;
        };
      });

      const future = flagged
        .filter((e) => !e.isPast)
        .sort((a, b) => a.__t - b.__t);
      const past = flagged
        .filter((e) => e.isPast)
        .sort((a, b) => b.__t - a.__t);
      return [...future, ...past].map(({ __t, ...r }) => r);
    }

    const sortedDesc = [...(events ?? [])]
      .sort((a, b) => new Date(b.start).getTime() - new Date(a.start).getTime())
      .map((e) => ({ ...e, isPast: false } as EventModel));
    return sortedDesc;
  }

  private truncateTime(d: Date): Date {
    return new Date(d.getFullYear(), d.getMonth(), d.getDate());
  }

  private pickYearFromMacro(events: { start: string }[]): number {
    if (!events?.length) return this.currentYear;
    const today = this.truncateTime(new Date()).getTime();
    const byDate = [...events].sort(
      (a, b) => new Date(a.start).getTime() - new Date(b.start).getTime()
    );
    const future = byDate.find(
      (e) => this.truncateTime(new Date(e.start)).getTime() >= today
    );
    const candidate = future ?? byDate[0];
    return new Date(candidate.start).getFullYear();
  }

  // ─── Modal Navigation ─────────────────────────────────────────
  canGoBack(): boolean {
    return (
      this.openedWithNavigation && this.modalNav.canGoBack() && !!this.item
    );
  }

  onBackModal(): void {
    const prev = this.modalNav.pop();
    if (!prev) return;
    if (prev.item === this.item && prev.typeModal === this.typeModal) return;
    this.currentModalAction = prev.action;
    this.item = prev.item;
    this.typeModal = prev.typeModal;
  }

  onCloseModal(): void {
    this.item = null;
    this.isModalVisible = false;
    this.modalNav.clear();
    this.openedWithNavigation = false;
  }

  // ─── Apertura de modales ──────────────────────────────────────
  onOpenEvent(eventId: number): void {
    const hasPrev = !!this.item;
    if (hasPrev) {
      this.modalNav.push({
        typeModal: this.typeModal,
        action: this.currentModalAction,
        item: this.item,
      });
      this.openedWithNavigation = true;
    } else {
      this.openedWithNavigation = false; // apertura inicial desde calendario
    }

    this.typeModal = TypeList.Events;
    this.currentModalAction = TypeActionModal.Show;
    this.item = null;
    this.isModalVisible = true;

    this.eventsService.getEventById(eventId).subscribe({
      next: (ev) => (this.item = ev),
      error: (err) => console.error('Error loading event', err),
    });
  }

  onOpenMacroEvent(macroId: number): void {
    const hasPrev = !!this.item;
    if (hasPrev) {
      this.modalNav.push({
        typeModal: this.typeModal,
        action: this.currentModalAction,
        item: this.item,
      });
      this.openedWithNavigation = true;
    } else {
      this.openedWithNavigation = false; // apertura directa desde calendario
    }

    this.typeModal = TypeList.Macroevents;
    this.currentModalAction = TypeActionModal.Show;
    this.item = null;
    this.isModalVisible = true;

    this.macroeventsService.getMacroeventById(macroId).subscribe({
      next: (macro) => (this.item = macro),
      error: (err) => console.error('Error loading macroevent', err),
    });
  }

  onOpenMulti(payload: { date: Date; events: any[] }): void {
    this.modalNav.push({
      typeModal: this.typeModal,
      action: this.currentModalAction,
      item: this.item,
    });

    this.typeModal = TypeList.MultiEvents;
    this.currentModalAction = TypeActionModal.Show;
    this.item = payload;
    this.isModalVisible = true;
  }
}
