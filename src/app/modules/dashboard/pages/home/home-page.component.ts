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

const AGE_BUCKETS = [
  { label: 'MENORES DE 18 años', min: null, max: 18 },
  { label: 'ENTRE 18-30 años', min: 18, max: 30 },
  { label: 'Entre 30-45 años', min: 30, max: 45 },
  { label: 'Entre 45 - 60 años', min: 45, max: 60 },
  { label: 'entre 60 - 75 años', min: 60, max: 75 },
  { label: 'Entre 75 y 80 años', min: 75, max: 80 },
  { label: 'mayores de 80 años', min: 80, max: null },
];

function bucketLabel(age: number): string {
  for (const b of AGE_BUCKETS) {
    const okMin = b.min == null || age >= b.min;
    const okMax = b.max == null || age < b.max; // [min, max)
    if (okMin && okMax) return b.label;
  }
  return 'Desconocido';
}
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
  readonly partnersAnnual$ = this.facade.partnersAnnual$;

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
  readonly partnersAnnualState$ = this.facade.partnersAnnualState$;
  readonly partnersKpisState$ = this.facade.partnersKpisState$;
  readonly pagesPerIssueState$ = this.facade.pagesPerIssueState$;
  readonly audienceYearState$ = this.facade.audienceYearState$;
  readonly partnersAgeBucketsState$ = this.facade.partnersAgeBucketsState$;
  readonly paymentsByMethodState$ = this.facade.paymentsByMethodState$;
  readonly paymentsByMonthState$ = this.facade.paymentsByMonthState$;
  monthName(n?: number): string {
    if (!n || n < 1 || n > 12) return '—';
    const nombres = [
      'enero',
      'febrero',
      'marzo',
      'abril',
      'mayo',
      'junio',
      'julio',
      'agosto',
      'septiembre',
      'octubre',
      'noviembre',
      'diciembre',
    ];
    return nombres[n - 1];
  }
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
