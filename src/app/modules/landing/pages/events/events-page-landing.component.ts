import { CommonModule } from '@angular/common';
import { Component, computed, DestroyRef, inject, OnInit } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ActivatedRoute, Router } from '@angular/router';
import { distinctUntilChanged, EMPTY, map, switchMap, tap } from 'rxjs';

import { EventsFacade } from 'src/app/application/events.facade';
import { FiltersFacade } from 'src/app/application/filters.facade';
import { MacroeventsFacade } from 'src/app/application/macroevents.facade';
import { ModalFacade } from 'src/app/application/modal.facade';
import { EventModel } from 'src/app/core/interfaces/event.interface';
import { TypeActionModal, TypeList } from 'src/app/core/models/general.model';
import { GeneralService } from 'src/app/core/services/generalService.service';

import { CalendarComponent } from 'src/app/shared/components/calendar/calendar.component';
import { FiltersComponent } from 'src/app/shared/components/filters/filters.component';
import { ModalShellComponent } from 'src/app/shared/components/modal/modal-shell.component';
import { NoResultsComponent } from 'src/app/shared/components/no-results/no-results.component';
import { SectionGenericComponent } from 'src/app/shared/components/section-generic/section-generic.component';
import { SpinnerLoadingComponent } from 'src/app/shared/components/spinner-loading/spinner-loading.component';
import { useEntityList } from 'src/app/shared/hooks/use-entity-list';
import { sortByDate } from 'src/app/shared/utils/facade.utils';

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
  readonly eventsFacade = inject(EventsFacade);
  readonly macroeventsFacade = inject(MacroeventsFacade);
  private readonly destroyRef = inject(DestroyRef);
  readonly modalFacade = inject(ModalFacade);
  readonly filtersFacade = inject(FiltersFacade);
  private readonly generalService = inject(GeneralService);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);

  // === Estado general ===
  readonly TypeList = TypeList;
  readonly TypeActionModal = TypeActionModal;
  readonly isDashboard = false;

  deepLinkMultiDate: string | null = null;
  readonly currentYear = this.generalService.currentYear;

  // === Datos base desde la fachada ===
  private readonly allBase$ = this.eventsFacade.allEvents$;
  private readonly groupedBase$ = this.eventsFacade.groupedEvents$;

  // === Derivados ===
  private readonly allForCalendar$ = this.allBase$.pipe(
    map((list) => sortByDate(list ?? []))
  );

  private readonly groupedForSection$ = this.groupedBase$.pipe(
    map((list) =>
      this.processNonRepeated(list ?? [], this.filterYearForCalendar)
    )
  );

  // === Hooks reutilizables (compat con tu HTML) ===
  readonly calendarList = useEntityList<EventModel>({
    filtered$: this.allForCalendar$,
    sort: (arr) => sortByDate(arr),
    count: (arr) => arr.length,
  });

  readonly sectionList = useEntityList<EventModel>({
    filtered$: this.groupedForSection$,
    map: (arr) => arr,
    sort: (arr) => arr, // ya viene ordenado
    count: (arr) => arr.length,
  });

  // === Signals derivados ===
  readonly upcomingListSig = computed(() =>
    this.sectionList.sortedSig().filter((e) => !(e as any).isPast)
  );

  readonly pastListSig = computed(() =>
    this.sectionList.sortedSig().filter((e) => (e as any).isPast)
  );

  // === Ciclo de vida ===
  ngOnInit(): void {
    // 1) Carga inicial de filtros
    this.filtersFacade.loadFiltersFor(TypeList.Events, '', 2018);

    // 2) Deep-links iniciales
    const initialId = this.route.snapshot.paramMap.get('id');
    const initialMulti = this.route.snapshot.queryParamMap.get('multiDate');

    if (!initialId && !initialMulti) {
      const current = Number(this.filtersFacade.selectedSig());
      this.loadEvents(current);
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
            // 🔹 Usa la fachada (no el service)
            return this.eventsFacade.loadEventsByMacroevent(numericId).pipe(
              tap((events) => {
                const y = this.pickYearFromMacro(events ?? []);
                this.loadEvents(y);
                this.deepLinkMultiDate = null;
              })
            );
          } else {
            // 🔹 Usa la fachada (no el service)
            return this.eventsFacade.getEventByIdOnce(numericId).pipe(
              tap((event) => {
                const y = new Date(event.start).getFullYear();
                this.loadEvents(y);
                this.deepLinkMultiDate = null;
              })
            );
          }
        }),
        takeUntilDestroyed(this.destroyRef)
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
          const y = new Date(md).getFullYear();
          this.loadEvents(y);
        }
      });
  }

  // === Año seleccionado (signal -> getter reactivo) ===
  get filterYearForCalendar(): number | null {
    const val = Number(this.filtersFacade.selectedSig());
    return Number.isFinite(val) ? val : null;
  }

  // === Carga de eventos por año ===
  loadEvents(year: number): void {
    this.filtersFacade.selectFilter(String(year));
    this.eventsFacade.loadYearBundle(year, 'published');
  }

  // === Callback del <app-filters> ===
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

  // === Procesamiento de eventos ===
  private processNonRepeated(
    events: EventModel[],
    selectedYear: number | null
  ): EventModel[] {
    const targetYear = selectedYear ?? this.currentYear;
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

  get filterYearNumber(): number | null {
    const val = this.filtersFacade.selectedSig();
    const num = Number(val);
    return isNaN(num) ? null : num;
  }
  // === Apertura de modales ===
  onOpenEvent(ev: EventModel | number): void {
    const id = typeof ev === 'number' ? ev : ev.id;

    this.eventsFacade
      .getEventByIdOnce(id)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((event) => {
        this.modalFacade.open(TypeList.Events, TypeActionModal.Show, event);
      });
  }

  onOpenMacroEvent(id: number): void {
    this.macroeventsFacade
      .getMacroeventByIdOnce(id)
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        tap((macro) =>
          this.modalFacade.open(
            TypeList.Macroevents,
            TypeActionModal.Show,
            macro
          )
        )
      )
      .subscribe(); // nada en subscribe
  }

  onOpenMulti(payload: { date: Date; events: any[] }): void {
    this.modalFacade.open(TypeList.MultiEvents, TypeActionModal.Show, payload);
  }
}
