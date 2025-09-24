import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { PeriodicVariant } from 'src/app/application/events.facade';

import { DashboardFacade } from 'src/app/application/dashboard.facade';
import { SpinnerLoadingComponent } from 'src/app/shared/components/spinner-loading/spinner-loading.component';
import { DictType } from 'src/app/shared/pipe/dict-translate.pipe';
import { TranslationsService } from 'src/i18n/translations.service';
import { AnnualLineChartComponent } from './charts/annual-line-chart/annual-line-chart.component';
import { CheeseChartComponent } from './charts/cheese-chart/cheese-chart.component';
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
  private readonly i18n = inject(TranslationsService);

  readonly years = this.facade.years;
  readonly currentYear = this.facade.currentYear;

  // Streams “crudos” que no pintan loading directamente
  readonly vm$ = this.facade.vm$;
  readonly eventsByMonthForChart$ = this.facade.eventsByMonthForChart$;
  readonly eventsByPlaceForChart$ = this.facade.eventsByPlaceForChart$;
  readonly annual$ = this.facade.annual$;
  readonly booksByGenreYear$ = this.facade.booksByGenreYear$;
  readonly moviesByGenreYear$ = this.facade.moviesByGenreYear$;
  readonly recipesByCategoryYear$ = this.facade.recipesByCategoryYear$;
  readonly membersAnnual$ = this.facade.membersAnnual$;

  // ✅ Estados listos para la vista
  readonly annualState$ = this.facade.annualState$;
  readonly eventsByMonthState$ = this.facade.eventsByMonthState$;
  readonly eventsByPlaceState$ = this.facade.eventsByPlaceHBarState$;
  readonly eventsByAccessYearState$ = this.facade.eventsByAccessYearState$;
  readonly eventsByCategoryYearState$ = this.facade.eventsByCategoryYearState$;
  readonly booksByGenreYearState$ = this.facade.booksByGenreYearState$;
  readonly moviesByGenreYearState$ = this.facade.moviesByGenreYearState$;
  readonly recipesByCategoryYearState$ =
    this.facade.recipesByCategoryYearState$;
  readonly membersAnnualState$ = this.facade.membersAnnualState$;
  readonly partnersKpisState$ = this.facade.partnersKpisState$;

  dictType = DictType;
  // getters/handlers UI
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
  get categoryDict(): Record<string, string> {
    const full = (this.i18n.dict() as any) ?? {};
    const cats = full.categories ?? {};
    // Normaliza a MAYÚSCULAS y añade 'other'
    const out: Record<string, string> = { other: 'Desconocido' };
    for (const k of Object.keys(cats)) out[k.toUpperCase()] = String(cats[k]);
    return out;
  }
  get accessDict(): Record<string, string> {
    const full = (this.i18n.dict() as any) ?? {};
    const acc = full.accessType ?? {};
    const out: Record<string, string> = { other: 'Desconocido' };
    for (const k of Object.keys(acc)) out[k.toUpperCase()] = String(acc[k]);
    return out;
  }
}
