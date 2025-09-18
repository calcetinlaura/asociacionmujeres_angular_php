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
import { ModalComponent } from 'src/app/shared/components/modal/modal.component'; // modal grande (tu antigua)
import { ImgBrokenDirective } from 'src/app/shared/directives/img-broken.directive';
import { ItemImagePipe } from 'src/app/shared/pipe/item-img.pipe';
import { ModalMultiEventComponent } from '../../../../../../shared/components/modal/pages/modal-multievent/modal-multievent.component';

@Component({
  selector: 'app-calendar',
  standalone: true,
  imports: [
    CommonModule,
    ModalComponent, // grande (una ficha)
    ModalMultiEventComponent, // pequeña (lista del día)
    ImgBrokenDirective,
    ItemImagePipe,
  ],
  templateUrl: './calendar.component.html',
  styleUrls: ['./calendar.component.css'],
})
export class CalendarComponent implements OnChanges {
  private readonly eventsFacade = inject(EventsFacade);

  @Input() events: EventModel[] = [];
  @Input() filterYear: number | null = null;

  calendar: { date: Date | null; events: EventModel[] }[] = [];
  currentMonth: number = new Date().getMonth();
  currentYear: number = new Date().getFullYear();

  // Modal grande (una tarjeta de evento)
  showModalView = false;
  selectedActionModal: TypeActionModal = TypeActionModal.Show;
  TypeActionModal = TypeActionModal;
  typeModal: TypeList = TypeList.Events;
  item: EventModel | null = null;

  // Modal pequeña (lista de eventos de un día)
  showMultiEventModal = false;
  multiEventItems: EventModel[] = [];

  ngOnChanges(changes: SimpleChanges): void {
    const filterYearChanged = changes['filterYear'];
    const eventsChanged = changes['events'];

    const isFilterYearChanged =
      filterYearChanged &&
      filterYearChanged.currentValue !== filterYearChanged.previousValue;

    const today = new Date();
    const currentYear = today.getFullYear();

    if (isFilterYearChanged) {
      if (this.filterYear === currentYear) {
        this.currentMonth = today.getMonth();
      } else {
        this.currentMonth = 0; // Enero
      }
    } else if (eventsChanged && this.events.length === 0 && this.filterYear) {
      if (this.filterYear === currentYear) {
        this.currentMonth = today.getMonth();
      } else {
        this.currentMonth = 0;
      }
    }

    this.generateCalendar();
  }

  generateCalendar(): void {
    const year = this.filterYear ?? this.currentYear;
    const month = this.currentMonth;
    const calendar: { date: Date | null; events: EventModel[] }[] = [];

    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const startDayOfWeek = (firstDay.getDay() + 6) % 7;

    for (let i = 0; i < startDayOfWeek; i++) {
      calendar.push({ date: null, events: [] });
    }

    for (let d = 1; d <= lastDay.getDate(); d++) {
      const date = new Date(year, month, d);
      const isoDate = date.toLocaleDateString('sv-SE'); // YYYY-MM-DD
      const events = this.events.filter((e) => e.start === isoDate);
      calendar.push({ date, events });
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

  // Abre modal según # de eventos en la celda
  openModalView(cell: { date: Date | null; events: EventModel[] }): void {
    if (!cell.date) return;

    if (cell.events.length === 1) {
      this.item = cell.events[0];
      this.showModalView = true;
      this.selectedActionModal = TypeActionModal.Show;
    } else if (cell.events.length > 1) {
      this.multiEventItems = cell.events;
      this.showMultiEventModal = true;
    }
  }

  openMultiEventModal(ev: MouseEvent, events: EventModel[]): void {
    ev?.stopPropagation();
    this.multiEventItems = events ?? [];
    this.showMultiEventModal = true;
  }

  // idem, por si usas otro handler
  handleCellClick(cell: { date: Date | null; events: EventModel[] }): void {
    if (!cell.date || cell.events.length === 0) return;
    if (cell.events.length === 1) {
      this.item = cell.events[0];
      this.showModalView = true;
      this.selectedActionModal = TypeActionModal.Show;
    } else {
      this.multiEventItems = cell.events;
      this.showMultiEventModal = true;
    }
  }

  // cierra la grande
  onCloseModal(): void {
    this.showModalView = false;
    this.item = null;
  }

  // seleccionas en la pequeña → abres la grande
  selectEventFromMulti(event: EventModel): void {
    this.item = event;
    this.showModalView = true;
    this.showMultiEventModal = false;
  }

  closeMultiEventModal(): void {
    this.showMultiEventModal = false;
    this.multiEventItems = [];
  }

  // utilidades UI
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
