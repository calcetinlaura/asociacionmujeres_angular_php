import { CommonModule } from '@angular/common';
import {
  Component,
  Input,
  OnChanges,
  SimpleChanges,
  inject,
} from '@angular/core';
import { EventsFacade } from 'src/app/application/events.facade';
import { EventModel } from 'src/app/core/interfaces/event.interface';
import { TypeActionModal, TypeList } from 'src/app/core/models/general.model';
import { ModalComponent } from 'src/app/shared/components/modal/modal.component';

@Component({
  selector: 'app-calendar',
  standalone: true,
  imports: [CommonModule, ModalComponent],
  templateUrl: './calendar.component.html',
  styleUrls: ['./calendar.component.css'],
})
export class CalendarComponent implements OnChanges {
  private readonly eventsFacade = inject(EventsFacade);

  @Input() events: EventModel[] = [];
  @Input() filterYear: number | null = null;

  calendar: { date: Date | null; event?: EventModel }[] = [];
  currentMonth: number = new Date().getMonth();
  currentYear: number = new Date().getFullYear();

  showModalView = false;
  selectedActionModal: TypeActionModal = TypeActionModal.Show;
  TypeActionModal = TypeActionModal;
  type: TypeList = TypeList.Events;
  item: EventModel | null = null;

  ngOnChanges(changes: SimpleChanges): void {
    const filterYearChanged = changes['filterYear'];
    const eventsChanged = changes['events'];

    const isFilterYearChanged =
      filterYearChanged &&
      filterYearChanged.currentValue !== filterYearChanged.previousValue;

    const today = new Date();
    const currentYear = today.getFullYear();

    if (isFilterYearChanged) {
      // 🔥 Si es año actual → empezar en mes actual
      if (this.filterYear === currentYear) {
        this.currentMonth = today.getMonth();
      } else {
        this.currentMonth = 0; // Enero
      }
    } else if (eventsChanged && this.events.length === 0 && this.filterYear) {
      // 🔥 Caso edge: filterYear sin eventos
      if (this.filterYear === currentYear) {
        this.currentMonth = today.getMonth();
      } else {
        this.currentMonth = 0;
      }
    }

    this.generateCalendar();
  }

  private setInitialMonthYearFromEvents(): void {
    const today = new Date();

    if (this.filterYear) {
      this.currentYear = this.filterYear;

      if (this.filterYear === today.getFullYear()) {
        // Si filterYear es el año actual real, usar mes actual
        this.currentMonth = today.getMonth();
      } else if (this.filterYear === 2025) {
        // 👈 Aquí puedes forzar la lógica especial que quieres:
        this.currentMonth = today.getMonth();
      } else if (this.events && this.events.length > 0) {
        const sortedEvents = [...this.events].sort((a, b) =>
          a.start.localeCompare(b.start)
        );
        const firstEventDate = new Date(sortedEvents[0].start);
        this.currentMonth = firstEventDate.getMonth();
      } else {
        this.currentMonth = 0; // Default: enero si no hay eventos
      }
    } else {
      // Fallback sin filterYear activo
      if (this.events && this.events.length > 0) {
        const sortedEvents = [...this.events].sort((a, b) =>
          a.start.localeCompare(b.start)
        );
        const firstEventDate = new Date(sortedEvents[0].start);
        const eventYear = firstEventDate.getFullYear();

        if (eventYear === today.getFullYear()) {
          this.currentMonth = today.getMonth();
        } else {
          this.currentMonth = firstEventDate.getMonth();
        }
        this.currentYear = firstEventDate.getFullYear();
      } else {
        this.currentMonth = today.getMonth();
        this.currentYear = today.getFullYear();
      }
    }
  }

  generateCalendar(): void {
    const year = this.filterYear ?? this.currentYear;
    const month = this.currentMonth;
    const calendar: { date: Date | null; event?: EventModel }[] = [];

    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const startDayOfWeek = (firstDay.getDay() + 6) % 7;

    for (let i = 0; i < startDayOfWeek; i++) {
      calendar.push({ date: null });
    }

    for (let d = 1; d <= lastDay.getDate(); d++) {
      const date = new Date(year, month, d);
      const isoDate = date.toLocaleDateString('sv-SE');
      const event = this.events.find((e) => e.start === isoDate);
      calendar.push({ date, event });
    }

    this.calendar = calendar;
  }

  nextMonth(): void {
    if (this.currentMonth === 11) {
      this.currentMonth = 0;
      this.currentYear = this.filterYear ?? this.currentYear + 1;
    } else {
      this.currentMonth++;
    }
    this.generateCalendar();
  }

  prevMonth(): void {
    if (this.currentMonth === 0) {
      this.currentMonth = 11;
      this.currentYear = this.filterYear ?? this.currentYear - 1;
    } else {
      this.currentMonth--;
    }
    this.generateCalendar();
  }

  get currentMonthLabel(): string {
    const year = this.filterYear ?? this.currentYear;
    return new Intl.DateTimeFormat('es-ES', {
      month: 'long',
      year: 'numeric',
    }).format(new Date(year, this.currentMonth));
  }

  openModalView(item: EventModel): void {
    this.item = item;
    this.showModalView = true;
    this.selectedActionModal = TypeActionModal.Show;
  }

  onCloseModal(): void {
    this.showModalView = false;
    this.item = null;
  }
  isToday(date: Date | null): boolean {
    if (!date) return false;
    const today = new Date();
    return (
      date.getFullYear() === today.getFullYear() &&
      date.getMonth() === today.getMonth() &&
      date.getDate() === today.getDate()
    );
  }
}
