import { CommonModule } from '@angular/common';
import {
  Component,
  EventEmitter,
  Input,
  OnChanges,
  Output,
  SimpleChanges,
  inject,
} from '@angular/core';
import {
  EventModel,
  EventModelFullData,
} from 'src/app/core/interfaces/event.interface';
import { TypeList } from 'src/app/core/models/general.model';
import { CalendarGridService } from 'src/app/core/services/calendar-grid.service';
import { EventsService } from 'src/app/core/services/events.services';
import { ImgBrokenDirective } from 'src/app/shared/directives/img-broken.directive';
import { ItemImagePipe } from 'src/app/shared/pipe/item-img.pipe';
import {
  hasImg,
  isDraft,
  isOnDate,
  isScheduled,
  toIsoDate,
} from '../../utils/events.utils';

// ✅ Nuevas utilidades y servicio extraídos

@Component({
  selector: 'app-calendar',
  standalone: true,
  imports: [CommonModule, ImgBrokenDirective, ItemImagePipe],
  templateUrl: './calendar.component.html',
  styleUrls: ['./calendar.component.css'],
})
export class CalendarComponent implements OnChanges {
  @Input() events: (EventModel | EventModelFullData)[] = [];
  @Input() filterYear: number | null = null;

  /** Panel de control */
  @Input() isDashboard = false;
  @Input() deepLinkMultiDate: string | null = null;

  /** Salidas hacia el padre */
  @Output() createEvent = new EventEmitter<string>(); // ISO YYYY-MM-DD
  @Output() viewEvent = new EventEmitter<number>();
  @Output() editEvent = new EventEmitter<number>();
  @Output() deleteEvent = new EventEmitter<number>();
  @Output() openMulti = new EventEmitter<{
    date: Date;
    events: (EventModel | EventModelFullData)[];
  }>();

  /** Datos del calendario */
  calendar: {
    date: Date | null;
    events: (EventModel | EventModelFullData)[];
  }[] = [];

  currentMonth: number = new Date().getMonth();
  currentYear: number = new Date().getFullYear();
  typeList = TypeList;

  private readonly eventsService = inject(EventsService);
  private readonly grid = inject(CalendarGridService);

  /** Para deep-link público (opcional) */
  private pendingMultiDate: string | null = null;

  ngOnChanges(changes: SimpleChanges): void {
    const filterYearChanged = changes['filterYear'];
    const eventsChanged = changes['events'];

    if (changes['deepLinkMultiDate']) {
      this.pendingMultiDate = this.deepLinkMultiDate ?? null;
      if (this.pendingMultiDate) {
        const d = new Date(this.pendingMultiDate);
        if (!isNaN(d.getTime())) {
          this.currentYear = d.getFullYear();
          this.currentMonth = d.getMonth();
        }
      }
    }

    const isFilterYearChanged =
      !!filterYearChanged &&
      filterYearChanged.currentValue !== filterYearChanged.previousValue;

    const today = new Date();
    const sysCurrentYear = today.getFullYear();

    if (this.pendingMultiDate) {
      const d = new Date(this.pendingMultiDate);
      if (!isNaN(d.getTime())) {
        this.currentYear = d.getFullYear();
        this.currentMonth = d.getMonth();
      }
    } else {
      if (isFilterYearChanged) {
        this.currentMonth =
          this.filterYear === sysCurrentYear ? today.getMonth() : 0;
        this.currentYear = this.filterYear ?? this.currentYear;
      } else if (eventsChanged && this.events.length === 0 && this.filterYear) {
        this.currentMonth =
          this.filterYear === sysCurrentYear ? today.getMonth() : 0;
        this.currentYear = this.filterYear;
      }
    }

    this.generateCalendar();
    this.tryEmitMultiFromQuery(); // opcional
  }

  /** Wrappers a utilidades (mantienen compatibilidad con la plantilla) */
  private toIsoDate(date: Date): string {
    return toIsoDate(date);
  }
  private isOnDate(isoDate: string, ev: any): boolean {
    return isOnDate(isoDate, ev);
  }
  public hasImg(ev: any): boolean {
    return hasImg(ev);
  }
  public isDraft(ev: any): boolean {
    return isDraft(ev);
  }
  public isScheduled(ev: any): boolean {
    return isScheduled(ev);
  }

  generateCalendar(): void {
    const year = this.getYearForCalendar();
    const month = this.currentMonth;
    // ✅ usamos el servicio reutilizable
    this.calendar = this.grid.buildMonthGrid(year, month, this.events);
  }

  nextMonth(): void {
    const baseYear = this.getYearForCalendar();
    if (this.currentMonth === 11) {
      this.currentMonth = 0;
      this.currentYear = baseYear + 1;
    } else {
      this.currentMonth++;
    }
    this.generateCalendar();
  }

  prevMonth(): void {
    const baseYear = this.getYearForCalendar();
    if (this.currentMonth === 0) {
      this.currentMonth = 11;
      this.currentYear = baseYear - 1;
    } else {
      this.currentMonth--;
    }
    this.generateCalendar();
  }

  get currentMonthLabel(): string {
    const year = this.getYearForCalendar();
    return new Intl.DateTimeFormat('es-ES', {
      month: 'long',
      year: 'numeric',
    }).format(new Date(year, this.currentMonth));
  }

  private getEventId(ev: EventModel | EventModelFullData): number | null {
    const id = (ev as any)?.id;
    return typeof id === 'number' ? id : null;
  }

  prefetchCell(cell: {
    date: Date | null;
    events: (EventModel | EventModelFullData)[];
  }): void {
    if (!cell?.date || !cell?.events?.length) return;
    const ids = Array.from(
      new Set(
        cell.events
          .map((e) => this.getEventId(e))
          .filter((v): v is number => v !== null)
      )
    );
    ids.forEach((id) => this.eventsService.prefetchEventById(id));
  }

  prefetchEventId(id?: number | null): void {
    if (typeof id === 'number') this.eventsService.prefetchEventById(id);
  }

  private getYearForCalendar(): number {
    if (this.pendingMultiDate) {
      const d = new Date(this.pendingMultiDate);
      if (!isNaN(d.getTime())) return d.getFullYear();
    }
    return this.filterYear ?? this.currentYear;
  }

  /** Click en celda: SOLO emite; el padre abre modal centralizada */
  openModalView(cell: {
    date: Date | null;
    events: (EventModel | EventModelFullData)[];
  }): void {
    if (!cell.date) return;

    const iso = this.toIsoDate(cell.date);
    const count = cell.events.length;

    // Celda vacía
    if (count === 0) {
      if (this.isDashboard) this.createEvent.emit(iso);
      return;
    }

    // DASHBOARD: SIEMPRE MULTI (aunque haya 1)
    if (this.isDashboard) {
      this.openMulti.emit({ date: cell.date, events: cell.events });
      return;
    }

    // PÚBLICO: 1 -> ficha, >1 -> multi
    if (count === 1) {
      const id = this.getEventId(cell.events[0]);
      if (id) this.viewEvent.emit(id);
      return;
    }

    this.openMulti.emit({ date: cell.date, events: cell.events });
  }

  handleCellClick(cell: {
    date: Date | null;
    events: (EventModel | EventModelFullData)[];
  }): void {
    this.openModalView(cell);
  }

  /** Si hay ?multiDate y quieres auto-abrir, emite openMulti para que el padre lo gestione */
  private tryEmitMultiFromQuery(): void {
    if (this.isDashboard || !this.pendingMultiDate) return;

    const cell = this.calendar.find(
      (c) => c.date && this.toIsoDate(c.date) === this.pendingMultiDate
    );

    if (cell) {
      this.prefetchCell(cell);
      this.openMulti.emit({ date: cell.date!, events: cell.events });
      this.pendingMultiDate = null;
    }
  }

  /** Utils visuales simples */
  isToday(date: Date | null): boolean {
    if (!date) return false;
    const today = new Date();
    return (
      date.getFullYear() === today.getFullYear() &&
      date.getMonth() === today.getMonth() &&
      date.getDate() === today.getDate()
    );
  }

  getFlexBasis(eventCount: number): string {
    if (eventCount <= 1) return '100%';
    if (eventCount <= 4) return '50%';
    return '33.3333%';
  }
}
