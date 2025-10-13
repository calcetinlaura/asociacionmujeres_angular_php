import { CommonModule } from '@angular/common';
import {
  ChangeDetectorRef,
  Component,
  EventEmitter,
  Input,
  OnChanges,
  Output,
  SimpleChanges,
  inject,
} from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { forkJoin } from 'rxjs';
import {
  EventModel,
  EventModelFullData,
} from 'src/app/core/interfaces/event.interface';
import { TypeActionModal, TypeList } from 'src/app/core/models/general.model';
import { EventsService } from 'src/app/core/services/events.services';
import { MacroeventsService } from 'src/app/core/services/macroevents.services';
import { ImgBrokenDirective } from 'src/app/shared/directives/img-broken.directive';
import { ItemImagePipe } from 'src/app/shared/pipe/item-img.pipe';
import { ModalShellComponent } from '../modal/modal-shell.component';
type ShellState = {
  visible: boolean;
  typeModal: TypeList;
  action: TypeActionModal;
  item: any;
  canGoBack: boolean;
};
@Component({
  selector: 'app-calendar',
  standalone: true,
  imports: [
    CommonModule,
    ImgBrokenDirective,
    ItemImagePipe,
    ModalShellComponent,
  ],
  templateUrl: './calendar.component.html',
  styleUrls: ['./calendar.component.css'],
})
export class CalendarComponent implements OnChanges {
  private readonly macroeventsService = inject(MacroeventsService);

  @Input() events: (EventModel | EventModelFullData)[] = [];
  @Input() filterYear: number | null = null;

  /** Panel de control */
  @Input() isDashboard = false;
  @Input() deepLinkMultiDate: string | null = null;

  /** Salidas hacia el padre (EventsPage) */
  @Output() createEvent = new EventEmitter<string>(); // ISO YYYY-MM-DD
  @Output() viewEvent = new EventEmitter<number>();
  @Output() editEvent = new EventEmitter<number>();
  @Output() deleteEvent = new EventEmitter<number>();

  /** Datos del calendario (celdas con fecha + eventos del día) */
  calendar: {
    date: Date | null;
    events: (EventModel | EventModelFullData)[];
  }[] = [];

  currentMonth: number = new Date().getMonth();
  currentYear: number = new Date().getFullYear();
  typeList = TypeList;

  /** Pantalla anterior (para volver de Event → MultiEvents) */
  private prevMulti: { events: any[]; date: Date } | null = null;

  /** Services / Router */
  private readonly eventsService = inject(EventsService);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);
  // ➊ Secuencia para invalidar respuestas tardías
  private macroLoadSeq = 0;
  /** Abrir multi cuando aún no hay datos/lista lista */
  private pendingMultiDate: string | null = null;
  shell: ShellState = {
    visible: false,
    typeModal: TypeList.MultiEvents,
    action: TypeActionModal.Show,
    item: null,
    canGoBack: false,
  };
  private readonly cdr = inject(ChangeDetectorRef);
  private navStack: ShellState[] = [];
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

    // 🟣 1) Si hay deep-link (?multiDate=...) pendiente, PRIORÍZALO:
    if (this.pendingMultiDate) {
      const d = new Date(this.pendingMultiDate);
      if (!isNaN(d.getTime())) {
        // Asegura que el mes/año del calendario coincidan con el deep link
        this.currentYear = d.getFullYear();
        this.currentMonth = d.getMonth();
      }
    } else {
      // 🔵 2) Sin deep-link: aplica tu lógica de filterYear habitual
      if (isFilterYearChanged) {
        this.currentMonth =
          this.filterYear === sysCurrentYear ? today.getMonth() : 0;
        // opcional mantener año sincronizado:
        this.currentYear = this.filterYear ?? this.currentYear;
      } else if (eventsChanged && this.events.length === 0 && this.filterYear) {
        this.currentMonth =
          this.filterYear === sysCurrentYear ? today.getMonth() : 0;
        this.currentYear = this.filterYear;
      }
    }

    this.generateCalendar();

    // 🟢 3) Intenta abrir MultiEventos si venía por deep-link
    this.tryOpenMultiFromQuery();
  }
  private isOnDate(isoDate: string, ev: any): boolean {
    const s: string | undefined = ev?.start
      ? String(ev.start).slice(0, 10)
      : undefined;
    const e: string = ev?.end ? String(ev.end).slice(0, 10) : s ?? '';
    if (!s) return false;
    // Comparación lexicográfica funciona con YYYY-MM-DD
    return s <= isoDate && isoDate <= e;
  }
  /** Abre MultiEvents si hay un multiDate pendiente en la URL (solo público) */
  private tryOpenMultiFromQuery(): void {
    if (this.isDashboard || !this.pendingMultiDate) return;

    const cell = this.calendar.find(
      (c) => c.date && this.toIsoDate(c.date) === this.pendingMultiDate
    );

    if (cell) {
      // precarga y abre modal multi
      this.prefetchCell(cell);
      this.openMultiEventModal(
        new MouseEvent('click'),
        cell.date!,
        cell.events
      );
      // mantenemos el query param tal cual para poder compartir/copy-paste
      this.pendingMultiDate = null; // ya consumido
    }
  }

  /** YYYY-MM-DD estable */
  private toIsoDate(date: Date): string {
    return date.toLocaleDateString('sv-SE');
  }

  /** Construye la matriz del mes actual */
  generateCalendar(): void {
    const year = this.getYearForCalendar();
    const month = this.currentMonth;
    const calendar: {
      date: Date | null;
      events: (EventModel | EventModelFullData)[];
    }[] = [];

    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const startDayOfWeek = (firstDay.getDay() + 6) % 7; // Lunes=0

    for (let i = 0; i < startDayOfWeek; i++) {
      calendar.push({ date: null, events: [] });
    }

    for (let d = 1; d <= lastDay.getDate(); d++) {
      const date = new Date(year, month, d);
      const iso = this.toIsoDate(date);
      // ⬇️ antes: e.start === iso
      const events = this.events.filter((e: any) => this.isOnDate(iso, e));
      calendar.push({ date, events });
    }

    this.calendar = calendar;
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

  /** Helpers de prefetch */
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

  /** Click en celda: abre shell con MultiEvents o Event según toque */
  openModalView(cell: {
    date: Date | null;
    events: (EventModel | EventModelFullData)[];
  }): void {
    if (!cell.date) return;

    const iso = this.toIsoDate(cell.date);

    if (this.isDashboard) {
      if (cell.events.length === 0) {
        // Crear directamente en Dashboard
        this.createEvent.emit(iso);
        return;
      }
      // Dashboard: abrir MultiEvents sin tocar URL
      this.prefetchCell(cell);
      this.prevMulti = { events: cell.events, date: cell.date };
      this.shell = {
        visible: true,
        typeModal: TypeList.MultiEvents,
        action: TypeActionModal.Show,
        item: this.prevMulti,
        canGoBack: false,
      };
      return;
    }

    // Público:
    if (cell.events.length === 1) {
      // 🔸 Caso 1 evento: NO tocamos URL (como pediste)
      const id = this.getEventId(cell.events[0]);
      this.prefetchEventId(id);
      this.shell = {
        visible: true,
        typeModal: TypeList.Events,
        action: TypeActionModal.Show,
        item: { id },
        canGoBack: false,
      };
      this.prevMulti = null;
    } else if (cell.events.length > 1) {
      // 🔹 Multi: abrimos modal Y ACTUALIZAMOS URL con ?multiDate=YYYY-MM-DD
      this.prefetchCell(cell);
      this.prevMulti = { events: cell.events, date: cell.date };
      this.shell = {
        visible: true,
        typeModal: TypeList.MultiEvents,
        action: TypeActionModal.Show,
        item: this.prevMulti,
        canGoBack: false,
      };
      this.setUrlQuery({ multiDate: iso, eventId: null });
    }
  }

  /** Overlay +N */

  handleCellClick(cell: {
    date: Date | null;
    events: (EventModel | EventModelFullData)[];
  }): void {
    this.openModalView(cell);
  }

  /** “openEvent” desde shell/router/multievent */
  onOpenEvent(id: number) {
    if (!id) return;

    // Guarda “de dónde vienes” (Multi o Macro)
    this.navStack.push({ ...this.shell });

    this.shell = {
      visible: true,
      typeModal: TypeList.Events,
      action: TypeActionModal.Show,
      item: { id },
      canGoBack: true, // <- siempre true al entrar a Event
    };
    // 🔸 NO tocamos URL aquí (lo hace la modal de Evento al compartir)
  }
  onOpenMacroevent(macroeventId: number) {
    if (!macroeventId) return;

    // Guarda pantalla actual para "volver"
    this.navStack.push({ ...this.shell });

    // 1) Abre shell YA con loading y, si tienes, pinta lista cacheada
    const peek = this.eventsService.peekEventsByMacro(macroeventId) ?? [];
    this.shell = {
      visible: true,
      typeModal: TypeList.Macroevents,
      action: TypeActionModal.Show,
      item: { id: macroeventId, events: peek, loading: true }, // 👈 importante
      canGoBack: true,
    };
    this.cdr.markForCheck();

    // 2) Deja que Angular pinte el skeleton en el siguiente frame
    requestAnimationFrame(() => {
      const macro$ = this.macroeventsService.getMacroeventById(macroeventId);
      const events$ = this.eventsService.getEventsByMacroevent(macroeventId);

      // Carga en paralelo
      forkJoin({ macro: macro$, events: events$ }).subscribe({
        next: ({ macro, events }) => {
          this.shell = {
            ...this.shell,
            item: { ...macro, events, loading: false },
          };
          this.cdr.markForCheck();
        },
        error: () => {
          this.shell = {
            ...this.shell,
            item: { id: macroeventId, events: [], loading: false, error: true },
          };
          this.cdr.markForCheck();
        },
      });
    });

    if (!this.isDashboard) {
      this.setUrlQuery({ macroeventId, eventId: null, multiDate: null });
    }
  }

  openMultiEventModal(
    ev: MouseEvent,
    date: Date,
    events: (EventModel | EventModelFullData)[]
  ): void {
    ev?.stopPropagation();
    this.prefetchCell({ date, events });
    this.prevMulti = { events, date };
    this.shell = {
      visible: true,
      typeModal: TypeList.MultiEvents,
      action: TypeActionModal.Show,
      item: this.prevMulti,
      canGoBack: false,
    };
    // Público: URL compartible para Multi
    if (!this.isDashboard) {
      this.setUrlQuery({ multiDate: this.toIsoDate(date), eventId: null });
    }
  }
  onShellBack() {
    if (this.navStack.length > 0) {
      const prev = this.navStack.pop()!;
      this.shell = { ...prev };

      // (Opcional) sincroniza URL con la pantalla restaurada
      if (!this.isDashboard) {
        if (prev.typeModal === TypeList.MultiEvents && prev.item?.date) {
          this.setUrlQuery({
            multiDate: this.toIsoDate(prev.item.date),
            eventId: null,
            macroeventId: null,
          });
        } else if (prev.typeModal === TypeList.Macroevents && prev.item?.id) {
          this.setUrlQuery({
            macroeventId: prev.item.id,
            eventId: null,
            multiDate: null,
          });
        } else {
          this.clearModalUrl();
        }
      }
    } else {
      this.onShellClose();
    }
  }

  onShellClose() {
    // invalida cualquier respuesta asíncrona en vuelo
    this.macroLoadSeq++;

    this.shell.visible = false;
    this.prevMulti = null;
    this.navStack = [];
    this.clearModalUrl();
  }

  /** Utils visuales */
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

  onViewFromShell(id: number) {
    this.onOpenEvent(id);
  }

  onEditFromShell(id: number) {
    this.editEvent.emit(id);
  }

  onRemoveFromShell(id: number) {
    this.deleteEvent.emit(id);
    // opcional: this.onShellClose();
  }

  /** URL helpers: solo en público */
  private setUrlQuery(params: Record<string, any>) {
    this.router.navigate([], {
      relativeTo: this.route,
      queryParams: params,
      queryParamsHandling: 'merge',
    });
  }

  private clearModalUrl() {
    this.router.navigate([], {
      relativeTo: this.route,
      queryParams: { eventId: null, multiDate: null, macroeventId: null }, // <- añade macroeventId
      queryParamsHandling: 'merge',
    });
  }
  private getYearForCalendar(): number {
    if (this.pendingMultiDate) {
      const d = new Date(this.pendingMultiDate);
      if (!isNaN(d.getTime())) return d.getFullYear();
    }
    return this.filterYear ?? this.currentYear;
  }
  addEventFromMultievent(iso: string) {
    this.createEvent.emit(iso);
  }
}
