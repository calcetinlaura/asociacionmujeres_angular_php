import { CommonModule } from '@angular/common';
import { Component, DestroyRef, inject, OnInit } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { tap } from 'rxjs';
import { EventsFacade } from 'src/app/application/events.facade';
import { EventModel } from 'src/app/core/interfaces/event.interface';
import { PlaceModel } from 'src/app/core/interfaces/place.interface';
import { Filter, TypeList } from 'src/app/core/models/general.model';
import { EventsService } from 'src/app/core/services/events.services';
import { FiltersComponent } from 'src/app/modules/landing/components/filters/filters.component';
import { NoResultsComponent } from 'src/app/modules/landing/components/no-results/no-results.component';
import { SectionGenericComponent } from 'src/app/modules/landing/components/section-generic/section-generic.component';
import { SpinnerLoadingComponent } from 'src/app/shared/components/spinner-loading/spinner-loading.component';
import { GeneralService } from 'src/app/shared/services/generalService.service';

@Component({
  selector: 'app-events-page-landing',
  standalone: true,
  imports: [
    CommonModule,
    FiltersComponent,
    SectionGenericComponent,
    NoResultsComponent,
    SpinnerLoadingComponent,
  ],
  templateUrl: './events-page-landing.component.html',
  styleUrl: './events-page-landing.component.css',
})
export class EventsPageLandingComponent implements OnInit {
  private readonly destroyRef = inject(DestroyRef);
  private readonly eventsFacade = inject(EventsFacade);
  private readonly eventsService = inject(EventsService);
  private readonly generalService = inject(GeneralService);

  events: EventModel[] = [];
  places: PlaceModel[] = [];
  filteredEvents: EventModel[] = [];
  filters: Filter[] = [];

  isLoading = true;
  areThereResults: boolean = false;
  typeList = TypeList;
  number: number = 0;
  selectedFilter: number | null = null;
  currentYear = this.generalService.currentYear;

  ngOnInit(): void {
    this.filters = this.generalService.getYearFilters(
      2018,
      this.currentYear,
      'Agenda'
    );

    this.filterSelected(this.currentYear.toString());

    this.eventsFacade.filteredEvents$
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        tap((events) => {
          console.log('EVENTOS ENRIQUECIDOS', events); // 👈
          this.updateEventState(events);
        })
      )
      .subscribe();
  }

  loadEventsByYear(year: number): void {
    this.selectedFilter = year;
    this.eventsFacade.loadEventsByYear(year);
  }

  filterSelected(filter: string): void {
    const year = Number(filter);
    if (!isNaN(year)) {
      this.loadEventsByYear(year);
    }
  }

  private updateEventState(events: EventModel[] | null): void {
    if (!events) return;

    const now = new Date();
    const currentYear = this.generalService.currentYear;

    const futureEvents: EventModel[] = [];
    const pastEvents: EventModel[] = [];

    for (const event of events) {
      const startDate = new Date(event.start);

      // Solo clasifica si es del año actual
      if (startDate.getFullYear() === currentYear) {
        if (startDate >= now) {
          futureEvents.push({ ...event, isPast: false });
        } else {
          pastEvents.push({ ...event, isPast: true });
        }
      } else {
        // Si no es del año actual, no se clasifica como pasado
        futureEvents.push({ ...event, isPast: false });
      }
    }

    // Ordenar los eventos ya clasificados (futuros + pasados)
    const allEvents = this.eventsService.sortEventsByDate([
      ...futureEvents,
      ...pastEvents,
    ]);

    this.events = allEvents;
    this.filteredEvents = [...allEvents];
    this.number = this.eventsService.countEvents(allEvents);
    this.areThereResults = this.eventsService.hasResults(allEvents);
    this.isLoading = false;
  }
}
