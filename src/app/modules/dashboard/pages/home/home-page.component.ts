import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { PeriodicVariant } from 'src/app/application/events.facade';

import { Observable } from 'rxjs';
import { DashboardFacade } from 'src/app/application/dashboard.facade';
import { YearCount } from 'src/app/core/services/analytics.service';
import { SpinnerLoadingComponent } from 'src/app/shared/components/spinner-loading/spinner-loading.component';
import { LoadState, withLoading } from 'src/app/shared/utils/loading.operator';
import { AnnualLineChartComponent } from './charts/annual-line-chart/annual-line-chart.component';
import {
  CheeseChartComponent,
  PieDatum,
} from './charts/cheese-chart/cheese-chart.component';
import { ChartCardComponent } from './charts/components/chart-card/chart-card.component';
import { DonutChartComponent } from './charts/donut-chart/donut-chart.component';
import { HorizontalBarChartComponent } from './charts/horizontal-bar-chart/horizontal-bar-chart.component';
import { MonthlyChartComponent } from './charts/monthly-chart/monthly-chart.component';
@Component({
  selector: 'app-home-page',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    MonthlyChartComponent,
    HorizontalBarChartComponent,
    ChartCardComponent,
    CheeseChartComponent,
    AnnualLineChartComponent,
    DonutChartComponent,
    SpinnerLoadingComponent,
  ],
  templateUrl: './home-page.component.html',
  styleUrls: ['./home-page.component.css'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class HomePageComponent {
  private readonly facade = inject(DashboardFacade);
  readonly years = this.facade.years;
  readonly currentYear = this.facade.currentYear;

  // Se “leen” desde la facade
  readonly vm$ = this.facade.vm$;
  readonly eventsByMonthForChart$ = this.facade.eventsByMonthForChart$;
  readonly eventsByPlaceForChart$ = this.facade.eventsByPlaceForChart$;
  readonly annual$ = this.facade.annual$;
  readonly booksByGenreYear$ = this.facade.booksByGenreYear$;
  readonly moviesByGenreYear$ = this.facade.moviesByGenreYear$;
  readonly recipesByCategoryYear$ = this.facade.recipesByCategoryYear$;
  readonly membersAnnual$ = this.facade.membersAnnual$;
  readonly annualState$ = withLoading(this.annual$);
  readonly eventsByMonthState$ = withLoading(this.eventsByMonthForChart$);
  readonly eventsByPlaceState$ = withLoading(this.eventsByPlaceForChart$);
  readonly booksByGenreYearState$: Observable<LoadState<PieDatum[]>> =
    withLoading<PieDatum[]>(this.booksByGenreYear$);

  readonly moviesByGenreYearState$: Observable<LoadState<PieDatum[]>> =
    withLoading<PieDatum[]>(this.moviesByGenreYear$);

  readonly recipesByCategoryYearState$: Observable<LoadState<PieDatum[]>> =
    withLoading<PieDatum[]>(this.recipesByCategoryYear$);

  readonly membersAnnualState$: Observable<LoadState<YearCount[]>> =
    withLoading<YearCount[]>(this.membersAnnual$);
  year() {
    return this.facade.year();
  }
  viewYear() {
    return this.facade.viewYear();
  }
  variant() {
    return this.facade.variant();
  }
  keyword() {
    return this.facade.keyword();
  }

  onChangeYear = (v: number | 'historic') => this.facade.changeYear(v);
  onChangeVariant = (v: PeriodicVariant) => this.facade.changeVariant(v);
  onSearch = (e: Event) =>
    this.facade.search((e.target as HTMLInputElement).value ?? '');
  clearSearch = () => this.facade.clearSearch();

  yearLabel(): string {
    return this.viewYear() === 'historic'
      ? 'Histórico'
      : String(this.viewYear());
  }
}
