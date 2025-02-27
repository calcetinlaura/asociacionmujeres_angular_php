import { Component, DestroyRef, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FiltersComponent } from '../../../components/filters/filters.component';
import { Filter, TypeList } from 'src/app/core/models/general.model';
import { SectionGenericComponent } from '../../../components/section-generic/section-generic.component';
import { EventsService } from 'src/app/core/services/events.services';
import { EventModel } from 'src/app/core/interfaces/event.interface';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { tap } from 'rxjs';
import { SpinnerLoadingComponent } from '../../../components/spinner-loading/spinner-loading.component';
import { NoResultsComponent } from '../../../components/no-results/no-results.component';
import { GeneralService } from 'src/app/shared/services/generalService.service';

@Component({
  selector: 'app-events-page-landing',
  standalone: true,
  imports: [
    CommonModule,
    FiltersComponent,
    SectionGenericComponent,
    SpinnerLoadingComponent,
    NoResultsComponent,
  ],
  templateUrl: './events-page-landing.component.html',
  styleUrl: './events-page-landing.component.css',
  providers: [EventsService],
})
export class EventsPageLandingComponent implements OnInit {
  private generalService = inject(GeneralService);
  private destroyRef = inject(DestroyRef);
  private EventsService = inject(EventsService);

  filtersEvents: Filter[] = [];
  typeList = TypeList;
  Events: EventModel[] = [];
  number: number = 0;
  selectedFilter: string = new Date().getFullYear().toString();
  isLoading = true;
  areThereResults: boolean = false;

  ngOnInit(): void {
    const currentYear = this.generalService.currentYear;
    const startYear = 2018;

    for (let year = startYear; year <= currentYear; year++) {
      if (year === currentYear) {
        this.filtersEvents.push({ code: year, name: `Agenda ${year}` });
      } else {
        this.filtersEvents.push({
          code: year.toString(),
          name: year.toString(),
        });
      }
    }
    // Invertir el array para que el último año esté primero
    this.filtersEvents.reverse();
    this.loadEventsByYear(this.selectedFilter);
  }

  loadEventsByYear(filter: string): void {
    this.EventsService.getEventsByYear(parseInt(filter))
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        tap({
          next: (data: EventModel[]) => {
            let EventsCopy = data.map((event) => ({
              ...event,
              start: event.start ? new Date(event.start) : new Date(),
              end: event.end ? new Date(event.end) : new Date(),
            }));

            EventsCopy = EventsCopy.sort(
              (a, b) => a.start.getTime() - b.start.getTime()
            );

            this.Events = EventsCopy.map((event) => ({
              ...event,
              start: event.start ? new Date(event.start).toISOString() : '',
              end: event.end ? new Date(event.end).toISOString() : '',
            }));

            this.number = this.Events.length;
            this.areThereResults = this.Events.length > 0;
          },
          error: (error) => {
            console.error(
              `Error al recuperar eventos filtrando por años ${filter}`,
              error
            );
          },
          complete: () => {
            this.isLoading = false;
          },
        })
      )
      .subscribe();
  }

  filterSelected(filter: string): void {
    this.selectedFilter = filter;
    this.loadEventsByYear(filter);
  }
}
