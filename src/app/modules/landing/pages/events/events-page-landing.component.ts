import { CommonModule } from '@angular/common';
import { Component, inject, OnInit } from '@angular/core';
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
import { Filter, TypeList } from 'src/app/core/models/general.model';
import { EventsService } from 'src/app/core/services/events.services';
import { FiltersComponent } from 'src/app/modules/landing/components/filters/filters.component';
import { NoResultsComponent } from 'src/app/modules/landing/components/no-results/no-results.component';
import { SectionGenericComponent } from 'src/app/modules/landing/components/section-generic/section-generic.component';
import { SpinnerLoadingComponent } from 'src/app/shared/components/spinner-loading/spinner-loading.component';
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
  ],
  templateUrl: './events-page-landing.component.html',
  styleUrls: ['./events-page-landing.component.css'],
})
export class EventsPageLandingComponent implements OnInit {
  readonly eventsFacade = inject(EventsFacade);
  private readonly eventsService = inject(EventsService);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly generalService = inject(GeneralService);

  filters: Filter[] = [];
  typeList = TypeList;
  selectedFilter: string | number | undefined = undefined; // <- EL AÑO SELECCIONADO EN LOS FILTROS
  currentYear = this.generalService.currentYear;
  isDashboard = false;

  deepLinkMultiDate: string | null = null;

  readonly eventsAll$ = this.eventsFacade.eventsAll$.pipe(
    map((events) => this.eventsService.sortEventsByDate(events ?? []))
  );
  // Año seleccionado como stream (fuente única de verdad)
  private selectedYear$ = new BehaviorSubject<number | null>(null);

  // Base de datos visible (latest o all) ya ordenada
  // ✅ Nuevo: base = ALL (incluye todos los pases)
  readonly allBase$ = this.eventsFacade.eventsAll$.pipe(
    map((list) => this.eventsService.sortEventsByDate(list ?? []))
  );

  // ✅ Filtra por año sobre ALL
  readonly eventsByYear$ = combineLatest([
    this.allBase$,
    this.selectedYear$,
  ]).pipe(
    map(([events, year]) => {
      if (!year) return events;
      return events.filter((e: any) => {
        const s = e?.start ? String(e.start).slice(0, 10) : '';
        const end = e?.end ? String(e.end).slice(0, 10) : s;
        if (!s) return false;
        const sy = Number(s.slice(0, 4));
        const ey = Number(end.slice(0, 4));
        if (!Number.isFinite(sy) || !Number.isFinite(ey)) return false;
        // hay solape si el rango [sy, ey] incluye el año
        return sy <= year && year <= ey;
      });
    })
  );

  // Si además quieres tu “no repetidos/enriquecidos” sobre el filtrado:
  readonly eventsNonRepeated$ = this.eventsByYear$.pipe(
    map((events) => this.processNonRepeated(events ?? []))
  );

  ngOnInit(): void {
    this.filters = this.generalService.getYearFilters(
      2018,
      this.currentYear,
      'Agenda'
    );

    const initialId = this.route.snapshot.paramMap.get('id');
    const initialMulti = this.route.snapshot.queryParamMap.get('multiDate');

    // Solo carga por defecto si NO vienes por deep link
    if (!initialId && !initialMulti) {
      this.loadEvents(this.currentYear);
    }

    // A) :id en /events/:id  -> fija año del evento
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
            // /macroevents/:id -> averigua año a partir de los eventos del macro
            return this.eventsService.getEventsByMacroevent(numericId).pipe(
              tap((events) => {
                const y = this.pickYearFromMacro(events ?? []);
                if (!isNaN(y) && y && y !== this.selectedFilter) {
                  this.loadEvents(y);
                }
                // al abrir macro por :id, anulamos deep link multiDate
                this.deepLinkMultiDate = null;
              })
            );
          } else {
            // /events/:id -> año del evento
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

    // B) ?multiDate=YYYY-MM-DD -> fija año de esa fecha y pásalo al calendario
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
  get filterYearForCalendar(): number | null {
    // si por algún flujo selectedFilter fuese string, lo normalizamos
    const val =
      typeof this.selectedFilter === 'number'
        ? this.selectedFilter
        : Number(this.selectedFilter);

    return Number.isFinite(val) ? (val as number) : null;
  }
  // ——— API de filtros ———
  loadEvents(year: number): void {
    this.selectedFilter = year; // UI filtros
    this.selectedYear$.next(year); // 👈 stream para filtrar listas
    this.eventsFacade.loadYearBundle(year);
  }

  filterSelected(filter: string): void {
    const year = Number(filter);
    if (!Number.isFinite(year)) return;

    // 1) Limpia cualquier deep link activo
    this.deepLinkMultiDate = null;

    // 2) Sal de /events/:id o /macroevents/:id y quita query params de modal
    this.router.navigate(['/events'], {
      queryParams: { eventId: null, multiDate: null },
      queryParamsHandling: 'merge',
    });

    // 3) Carga el año (esto actualiza selectedFilter y streams)
    this.loadEvents(year);
  }

  // ——— Helpers ———
  private processNonRepeated(events: EventModel[]): EventModel[] {
    const today = this.truncateTime(new Date());
    const sorted = this.eventsService.sortEventsByDate(events);

    const enriched = sorted.map((e) => {
      const start = new Date(e.start);
      const isCurrentYear = start.getFullYear() === this.currentYear;
      const isPast = isCurrentYear && this.truncateTime(start) < today;
      return { ...e, isPast };
    });

    const futureOrToday: EventModel[] = [];
    const past: EventModel[] = [];
    for (const ev of enriched) (ev.isPast ? past : futureOrToday).push(ev);

    return [...futureOrToday, ...past];
  }

  private truncateTime(d: Date): Date {
    return new Date(d.getFullYear(), d.getMonth(), d.getDate());
  }

  /** Escoge un año representativo para un macroevento:
   *  - primero intenta el año del primer evento FUTURO
   *  - si no hay, usa el del primer evento de la lista
   */
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
}
