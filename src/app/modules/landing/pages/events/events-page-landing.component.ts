import { CommonModule } from '@angular/common';
import { Component, OnInit, inject } from '@angular/core';
import { map } from 'rxjs';
import { EventsFacade } from 'src/app/application/events.facade';
import { EventModel } from 'src/app/core/interfaces/event.interface';
import { Filter, TypeList } from 'src/app/core/models/general.model';
import { EventsService } from 'src/app/core/services/events.services';
import { FiltersComponent } from 'src/app/modules/landing/components/filters/filters.component';
import { NoResultsComponent } from 'src/app/modules/landing/components/no-results/no-results.component';
import { SectionGenericComponent } from 'src/app/modules/landing/components/section-generic/section-generic.component';
import { SpinnerLoadingComponent } from 'src/app/shared/components/spinner-loading/spinner-loading.component';
import { GeneralService } from 'src/app/shared/services/generalService.service';
import { CalendarComponent } from './components/calendar/calendar.component';

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
  styleUrl: './events-page-landing.component.css',
})
export class EventsPageLandingComponent implements OnInit {
  readonly eventsFacade = inject(EventsFacade);
  private readonly eventsService = inject(EventsService);
  private readonly generalService = inject(GeneralService);

  filters: Filter[] = [];
  typeList = TypeList;
  selectedFilter: number | null = null;
  currentYear = this.generalService.currentYear;

  // 🔹 Derivados como observables para usar con | async
  readonly eventsNonRepeated$ = this.eventsFacade.visibleEvents$.pipe(
    map((events) => this.processNonRepeated(events ?? []))
  );

  readonly eventsAll$ = this.eventsFacade.eventsAll$.pipe(
    map((events) => this.eventsService.sortEventsByDate(events ?? []))
  );

  // (Opcional) si tu LoadableFacade expone loading$: úsala en plantilla
  // readonly isLoading$ = this.eventsFacade.loading$;

  ngOnInit(): void {
    this.filters = this.generalService.getYearFilters(
      2018,
      this.currentYear,
      'Agenda'
    );
    this.loadEvents(this.currentYear);
  }

  loadEvents(year: number): void {
    this.selectedFilter = year;
    // ✅ una sola llamada, la fachada ya carga all + latest
    this.eventsFacade.loadYearBundle(year);
  }

  filterSelected(filter: string): void {
    const year = Number(filter);
    if (!isNaN(year)) this.loadEvents(year);
  }

  // ---- Helpers puros ----
  private processNonRepeated(events: EventModel[]): EventModel[] {
    const today = this.truncateTime(new Date());
    const sorted = this.eventsService.sortEventsByDate(events);

    // Marca isPast solo para eventos del año actual y anteriores a hoy
    const enriched = sorted.map((e) => {
      const start = new Date(e.start);
      const isCurrentYear = start.getFullYear() === this.currentYear;
      const isPast = isCurrentYear && this.truncateTime(start) < today;
      return { ...e, isPast };
    });

    // Opcional: reordenar “futuros/HOY” primero, luego pasados
    const futureOrToday: EventModel[] = [];
    const past: EventModel[] = [];
    for (const ev of enriched) (ev.isPast ? past : futureOrToday).push(ev);

    return [...futureOrToday, ...past];
  }

  private truncateTime(d: Date): Date {
    return new Date(d.getFullYear(), d.getMonth(), d.getDate());
  }
}
