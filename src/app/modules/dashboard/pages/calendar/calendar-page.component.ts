import { CommonModule } from '@angular/common';
import {
  ChangeDetectorRef,
  Component,
  DestroyRef,
  OnInit,
  inject,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormsModule } from '@angular/forms';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { finalize, map, of, switchMap, tap } from 'rxjs';

import { EventsFacade } from 'src/app/application/events.facade';
import {
  Filter,
  TypeActionModal,
  TypeList,
} from 'src/app/core/models/general.model';
import { EventsService } from 'src/app/core/services/events.services';
import { GeneralService } from 'src/app/shared/services/generalService.service';

import { FiltersComponent } from 'src/app/modules/landing/components/filters/filters.component';
import { CalendarComponent } from 'src/app/shared/components/calendar/calendar.component';
import { SpinnerLoadingComponent } from 'src/app/shared/components/spinner-loading/spinner-loading.component';
import { DashboardHeaderComponent } from '../../components/dashboard-header/dashboard-header.component';
import { StickyZoneComponent } from '../../components/sticky-zone/sticky-zone.component';

// Modal (igual que en tu EventsPage)
import { ModalShellComponent } from 'src/app/shared/components/modal/modal-shell.component';
import { ModalNavService } from 'src/app/shared/components/modal/services/modal-nav.service';
import { ModalService } from 'src/app/shared/components/modal/services/modal.service';

import { EventModelFullData } from 'src/app/core/interfaces/event.interface';
import { MacroeventsService } from 'src/app/core/services/macroevents.services';

type MultiEventsPayload = { date: Date; events: any[] };
type ModalItem = EventModelFullData | MultiEventsPayload | null;
@Component({
  selector: 'app-calendar-page',
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
    ModalShellComponent,
  ],
  templateUrl: './calendar-page.component.html',
  styleUrls: ['./calendar-page.component.css'],
})
export class CalendarPageComponent implements OnInit {
  // ── Inyección ────────────────────────────────────────────────────────────────
  private readonly destroyRef = inject(DestroyRef);
  private readonly eventsService = inject(EventsService);
  private readonly macroeventsService = inject(MacroeventsService);
  private readonly generalService = inject(GeneralService);
  private readonly modalService = inject(ModalService);
  private readonly modalNav = inject(ModalNavService<EventModelFullData>);
  private readonly cdr = inject(ChangeDetectorRef);

  readonly eventsFacade = inject(EventsFacade);

  // ── Estado página ────────────────────────────────────────────────────────────
  filters: Filter[] = [];
  selectedFilter: number | null = null;
  currentYear = this.generalService.currentYear;

  // Modal shell
  isModalVisible = false;
  item: ModalItem = null;
  currentModalAction: TypeActionModal = TypeActionModal.Create;
  typeModal: TypeList = TypeList.Events;

  // Datos
  readonly events$ = this.eventsFacade.eventsAll$.pipe(
    map((events) => this.eventsService.sortEventsByDate(events ?? []))
  );

  // ── Lifecycle ────────────────────────────────────────────────────────────────
  ngOnInit(): void {
    this.filters = this.generalService.getYearFilters(
      2018,
      this.currentYear,
      'Agenda'
    );
    this.loadEvents(this.currentYear);

    this.modalService.modalVisibility$
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((v) => (this.isModalVisible = v));
  }

  // ── Carga/Filtros ────────────────────────────────────────────────────────────
  loadEvents(year: number): void {
    this.selectedFilter = year;
    this.eventsFacade.loadYearBundle(year);
    this.eventsFacade.loadEventsByYear(year, 'all');
  }

  filterSelected(filter: string): void {
    const year = Number(filter);
    if (!isNaN(year)) this.loadEvents(year);
  }

  get hasSelectedYear(): boolean {
    return this.selectedFilter != null;
  }

  // ── Modal helpers ────────────────────────────────────────────────────────────
  private openModal(
    typeModal: TypeList,
    action: TypeActionModal,
    item: EventModelFullData | null
  ): void {
    this.currentModalAction = action;
    this.item = item;
    this.typeModal = typeModal;

    if (typeModal === TypeList.Events && action === TypeActionModal.Create) {
      this.eventsFacade.clearSelectedEvent?.();
    }

    this.modalService.openModal();
  }
  onOpenMulti = (payload: MultiEventsPayload) => {
    console.log('[CalendarPage] openMulti', payload);
    this.typeModal = TypeList.MultiEvents;
    this.currentModalAction = TypeActionModal.Show;
    this.item = payload; // <- ahora coincide el tipo
    this.modalService.openModal();
  };

  get canGoBack(): boolean {
    return this.modalNav.canGoBack() && !!this.item;
  }

  onBackModal(): void {
    const prev = this.modalNav.pop();
    if (!prev) return;
    this.currentModalAction = prev.action;
    this.item = prev.item;
    this.typeModal = prev.typeModal;
  }

  onCloseModal(): void {
    this.modalService.closeModal();
    this.item = null;
    this.modalNav.clear();
  }

  // ── Acciones desde el calendario (Dashboard) ────────────────────────────────
  onCreateEventAtDate = (iso: string) => {
    console.log('[CalendarPage] Crear evento en fecha', iso);
    this.openModal(TypeList.Events, TypeActionModal.Create, null);
    this.eventsFacade.prefillDate?.(iso);
  };

  onOpenEvent = (eventId: number) => {
    console.log('[CalendarPage] onOpenEvent START id=', eventId);

    // Guarda el estado actual para permitir volver atrás
    this.modalNav.push({
      typeModal: this.typeModal,
      action: this.currentModalAction,
      item: this.item,
    });

    // Abrimos modal de forma optimista con item = null → se mostrará spinner
    this.typeModal = TypeList.Events;
    this.currentModalAction = TypeActionModal.Show;
    this.item = null;

    this.modalService.openModal();
    console.log('[CalendarPage] modal opened optimistically with item=null');

    // Pedimos los datos reales del evento
    this.eventsService
      .getEventById(eventId)
      .pipe(tap((ev) => console.log('[CalendarPage] tap ev', ev)))
      .subscribe({
        next: (ev) => {
          console.log('[CalendarPage] getEventById OK', ev);
          this.item = ev;
          this.cdr.detectChanges();
        },
        error: (err) => {
          console.error('[CalendarPage] getEventById ERROR', err);
          this.item = {
            id: 0,
            title: 'No se pudo cargar el evento',
            start: '',
            end: '',
            time_start: '00:00:00',
          } as any;
          this.cdr.detectChanges();
        },
        complete: () => {
          console.log('[CalendarPage] getEventById COMPLETE');
        },
      });
  };
  onOpenMacroEvent = (macroId: number) => {
    if (!macroId) return;

    // 🧠 Guarda el estado actual en el stack
    this.modalNav.push({
      typeModal: this.typeModal,
      action: this.currentModalAction,
      item: this.item,
    });

    // Abre modal de forma optimista
    this.typeModal = TypeList.Macroevents;
    this.currentModalAction = TypeActionModal.Show;
    this.item = null;
    this.modalService.openModal();

    // Fetch del macroevento
    this.macroeventsService
      .getMacroeventById(macroId)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (macro) => {
          this.item = macro;
          this.cdr.detectChanges();
        },
        error: (err) => {
          console.error('[CalendarPage] Error al cargar macroevento', err);
        },
      });
  };
  onEditEvent = (eventId: number) => {
    this.modalNav.push({
      typeModal: this.typeModal,
      action: this.currentModalAction,
      item: this.item,
    });

    // 👇 Abre YA la modal en modo loading
    this.typeModal = TypeList.Events;
    this.currentModalAction = TypeActionModal.Edit;
    this.item = null;
    this.modalService.openModal();

    // Fetch del evento
    this.eventsService
      .getEventById(eventId)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (ev) => {
          this.item = ev;
        },
        error: (err) => console.error('Error cargando evento para editar', err),
      });
  };

  onDeleteEvent = (eventId: number) => {
    this.eventsFacade.deleteEvent(eventId);
  };
  private isEventItem(x: any): x is EventModelFullData {
    return !!x && typeof x === 'object' && 'id' in x && 'start' in x;
  }
  // Si usas el mismo flujo de guardado que en EventsPage:
  sendFormEvent(event: { itemId: number; formData: FormData }): void {
    const currentItem = this.item; // puede ser EventModelFullData | MultiEventsPayload | null
    const newPeriodicId = event.formData.get('periodic_id');

    // ✅ solo lee periodic_id si el item actual es un EventModelFullData
    const oldPeriodicId = this.isEventItem(currentItem)
      ? currentItem.periodic_id ?? null
      : null;

    const isRepeatedToUnique = !!oldPeriodicId && !newPeriodicId;

    const request$ = event.itemId
      ? this.eventsFacade.editEvent(event.formData)
      : this.eventsFacade.addEvent(event.formData);

    request$
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        switchMap(() =>
          isRepeatedToUnique && oldPeriodicId
            ? this.eventsService.deleteOtherEventsByPeriodicId(
                oldPeriodicId,
                event.itemId
              )
            : of(null)
        ),
        finalize(() => this.onCloseModal())
      )
      .subscribe();
  }
}
