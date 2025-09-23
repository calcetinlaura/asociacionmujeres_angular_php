import { Component, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { map } from 'rxjs';

import { EventsFacade } from 'src/app/application/events.facade';
import { Filter, TypeList } from 'src/app/core/models/general.model';
import { EventsService } from 'src/app/core/services/events.services';
import { GeneralService } from 'src/app/shared/services/generalService.service';

import { CommonModule } from '@angular/common';
import { FiltersComponent } from 'src/app/modules/landing/components/filters/filters.component';
import { CalendarComponent } from 'src/app/modules/landing/pages/events/components/calendar/calendar.component';
import { SpinnerLoadingComponent } from 'src/app/shared/components/spinner-loading/spinner-loading.component';
import { DashboardHeaderComponent } from '../../components/dashboard-header/dashboard-header.component';
import { StickyZoneComponent } from '../../components/sticky-zone/sticky-zone.component';

@Component({
  selector: 'app-recipes-page',
  standalone: true,
  imports: [
    CommonModule,
    MatCheckboxModule,
    FormsModule,
    SpinnerLoadingComponent,
    DashboardHeaderComponent,
    StickyZoneComponent,
    FiltersComponent,
    CalendarComponent,
  ],
  templateUrl: './calendar-page.component.html',
  styleUrl: './calendar-page.component.css',
})
export class CalendarPageComponent {
  readonly eventsFacade = inject(EventsFacade);
  private readonly eventsService = inject(EventsService);
  private readonly generalService = inject(GeneralService);

  filters: Filter[] = [];
  typeList = TypeList;
  selectedFilter: number | null = null;
  currentYear = this.generalService.currentYear;

  /** ✅ TODOS los eventos del año seleccionado (ordenados) */
  readonly events$ = this.eventsFacade.eventsAll$.pipe(
    map((events) => this.eventsService.sortEventsByDate(events ?? []))
  );

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
    // Carga ambas fuentes en la caché y fija 'all' como visible por si lo usas en otras vistas
    this.eventsFacade.loadYearBundle(year);
    this.eventsFacade.loadEventsByYear(year, 'all');
  }

  filterSelected(filter: string): void {
    const year = Number(filter);
    if (!isNaN(year)) this.loadEvents(year);
  }
  get hasSelectedYear() {
    return this.selectedFilter != null;
  }
}
