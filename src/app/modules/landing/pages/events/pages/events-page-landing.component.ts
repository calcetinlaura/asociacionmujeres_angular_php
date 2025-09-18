import { CommonModule } from '@angular/common';
import { Component, DestroyRef, OnInit, inject } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { tap } from 'rxjs';
import { EventsFacade } from 'src/app/application/events.facade';
import { EventModel } from 'src/app/core/interfaces/event.interface';
import { Filter, TypeList } from 'src/app/core/models/general.model';
import { EventsService } from 'src/app/core/services/events.services';
import { FiltersComponent } from 'src/app/modules/landing/components/filters/filters.component';
import { NoResultsComponent } from 'src/app/modules/landing/components/no-results/no-results.component';
import { SectionGenericComponent } from 'src/app/modules/landing/components/section-generic/section-generic.component';
import { SpinnerLoadingComponent } from 'src/app/shared/components/spinner-loading/spinner-loading.component';
import { GeneralService } from 'src/app/shared/services/generalService.service';
import { CalendarComponent } from '../components/calendar/calendar.component';

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
  private readonly destroyRef = inject(DestroyRef);
  readonly eventsFacade = inject(EventsFacade);
  private readonly eventsService = inject(EventsService);
  private readonly generalService = inject(GeneralService);

  nonRepeatedEvents: EventModel[] = []; // Lista principal sin repetidos
  eventsAll: EventModel[] = []; // Todos los eventos para el calendario
  filters: Filter[] = [];

  isLoading = true;
  areThereResults = false;
  showCalendar = false;
  typeList = TypeList;
  number = 0;
  selectedFilter: number | null = null;
  currentYear = this.generalService.currentYear;

  ngOnInit(): void {
    this.filters = this.generalService.getYearFilters(
      2018,
      this.currentYear,
      'Agenda'
    );
    this.loadEvents(this.currentYear);

    this.eventsFacade.nonRepeatedEvents$
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        tap((events) => this.handleNonRepeatedEvents(events))
      )
      .subscribe();

    this.eventsFacade.eventsAll$
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        tap((events) => {
          this.eventsAll = this.eventsService.sortEventsByDate(events || []);
        })
      )
      .subscribe();
  }

  loadEvents(year: number): void {
    this.selectedFilter = year;
    this.eventsFacade.loadNonRepeatedEventsByYear(year);
    this.eventsFacade.loadEventsAllByYear(year);
  }

  filterSelected(filter: string): void {
    const year = Number(filter);
    if (!isNaN(year)) {
      this.loadEvents(year);
    }
  }

  private handleNonRepeatedEvents(events: EventModel[] | null): void {
    if (!events) return;

    const today = this.truncateTime(new Date());

    const futureEvents: EventModel[] = [];
    const pastEvents: EventModel[] = [];

    for (const event of events) {
      const startDate = new Date(event.start);
      const eventYear = startDate.getFullYear();

      const isCurrentYear = eventYear === this.currentYear;
      const isFutureOrToday = this.truncateTime(startDate) >= today;

      const isPast = isCurrentYear && !isFutureOrToday;
      const processedEvent = { ...event, isPast };

      if (isPast) pastEvents.push(processedEvent);
      else futureEvents.push(processedEvent);
    }

    const sortedEvents = this.eventsService.sortEventsByDate([
      ...futureEvents,
      ...pastEvents,
    ]);

    this.nonRepeatedEvents = sortedEvents;
    this.number = this.eventsService.countEvents(sortedEvents);
    this.areThereResults = this.eventsService.hasResults(sortedEvents);
    this.isLoading = false;
    this.showCalendar = true;
  }

  private truncateTime(date: Date): Date {
    return new Date(date.getFullYear(), date.getMonth(), date.getDate());
  }
}
