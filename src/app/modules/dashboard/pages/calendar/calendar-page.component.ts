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
import { finalize, map, of, switchMap } from 'rxjs';

import { EventsFacade } from 'src/app/application/events.facade';
import {
  Filter,
  TypeActionModal,
  TypeList,
} from 'src/app/core/models/general.model';
import { EventsService } from 'src/app/core/services/events.services';
import { GeneralService } from 'src/app/shared/services/generalService.service';

import { CalendarComponent } from 'src/app/shared/components/calendar/calendar.component';
import { DashboardHeaderComponent } from 'src/app/shared/components/dashboard-header/dashboard-header.component';
import { FiltersComponent } from 'src/app/shared/components/filters/filters.component';
import { SpinnerLoadingComponent } from 'src/app/shared/components/spinner-loading/spinner-loading.component';
import { StickyZoneComponent } from 'src/app/shared/components/sticky-zone/sticky-zone.component';

// Modal
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
  // Inyección
  private readonly destroyRef = inject(DestroyRef);
  private readonly eventsService = inject(EventsService);
  private readonly macroeventsService = inject(MacroeventsService);
  private readonly generalService = inject(GeneralService);
  private readonly modalService = inject(ModalService);
  private readonly modalNav = inject(ModalNavService<EventModelFullData>);
  private readonly cdr = inject(ChangeDetectorRef);

  readonly eventsFacade = inject(EventsFacade);

  // Estado
  filters: Filter[] = [];
  selectedFilter: number | null = null;
  currentYear = this.generalService.currentYear;

  // Modal
  isModalVisible = false;
  item: ModalItem = null;
  currentModalAction: TypeActionModal = TypeActionModal.Create;
  typeModal: TypeList = TypeList.Events;

  // Datos (siempre “todo junto”, no agrupado)
  readonly events$ = this.eventsFacade.allEvents$.pipe(
    map((events) => this.eventsService.sortEventsByDate(events ?? []))
  );
  ngOnInit(): void {
    // Solo filtros por año
    this.filters = this.generalService.getYearFilters(
      2018,
      this.currentYear,
      'Agenda'
    );

    // Carga inicial: año actual, NO agrupado, scope=all
    this.loadYear(this.currentYear);

    this.modalService.modalVisibility$
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((v) => (this.isModalVisible = v));
  }

  // Carga/Filtros
  private loadYear(year: number): void {
    this.selectedFilter = year;
    this.eventsFacade.applyFilterWord('');
    // Dashboard calendario: todos los estados, no agrupado
    this.eventsFacade.loadDashboardAllNotGrouped(year);
  }

  filterSelected(filter: string): void {
    const year = Number(filter);
    if (!isNaN(year)) this.loadYear(year);
  }

  get hasSelectedYear(): boolean {
    return this.selectedFilter != null;
  }

  // Modal helpers
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
    this.typeModal = TypeList.MultiEvents;
    this.currentModalAction = TypeActionModal.Show;
    this.item = payload;
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

  // Acciones calendario
  onCreateEventAtDate = (iso: string) => {
    this.openModal(TypeList.Events, TypeActionModal.Create, null);
    this.eventsFacade.prefillDate?.(iso);
  };

  onOpenEvent = (eventId: number) => {
    this.modalNav.push({
      typeModal: this.typeModal,
      action: this.currentModalAction,
      item: this.item,
    });

    this.typeModal = TypeList.Events;
    this.currentModalAction = TypeActionModal.Show;
    this.item = null;
    this.modalService.openModal();

    this.eventsService.getEventById(eventId).subscribe({
      next: (ev) => {
        this.item = ev;
        this.cdr.detectChanges();
      },
      error: () => {
        this.item = {
          id: 0,
          title: 'No se pudo cargar el evento',
          start: '',
          end: '',
          time_start: '00:00:00',
        } as any;
        this.cdr.detectChanges();
      },
    });
  };

  onOpenMacroEvent = (macroId: number) => {
    if (!macroId) return;

    this.modalNav.push({
      typeModal: this.typeModal,
      action: this.currentModalAction,
      item: this.item,
    });

    this.typeModal = TypeList.Macroevents;
    this.currentModalAction = TypeActionModal.Show;
    this.item = null;
    this.modalService.openModal();

    this.macroeventsService
      .getMacroeventById(macroId)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (macro) => {
          this.item = macro;
          this.cdr.detectChanges();
        },
        error: (err) =>
          console.error('[CalendarPage] Error al cargar macroevento', err),
      });
  };

  onEditEvent = (eventId: number) => {
    this.modalNav.push({
      typeModal: this.typeModal,
      action: this.currentModalAction,
      item: this.item,
    });

    this.typeModal = TypeList.Events;
    this.currentModalAction = TypeActionModal.Edit;
    this.item = null;
    this.modalService.openModal();

    this.eventsService
      .getEventById(eventId)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (ev) => (this.item = ev),
        error: (err) => console.error('Error cargando evento para editar', err),
      });
  };

  onDeleteEvent = (eventId: number) => {
    this.eventsFacade.deleteEvent(eventId);
  };

  private isEventItem(x: any): x is EventModelFullData {
    return !!x && typeof x === 'object' && 'id' in x && 'start' in x;
  }

  sendFormEvent(event: { itemId: number; formData: FormData }): void {
    const currentItem = this.item;
    const newPeriodicId = event.formData.get('periodic_id');
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
