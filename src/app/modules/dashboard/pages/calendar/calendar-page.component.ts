import { CommonModule } from '@angular/common';
import { Component, DestroyRef, OnInit, inject } from '@angular/core';
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
  private readonly generalService = inject(GeneralService);
  private readonly modalService = inject(ModalService);
  private readonly modalNav = inject(ModalNavService<EventModelFullData>);

  readonly eventsFacade = inject(EventsFacade);

  // ── Estado página ────────────────────────────────────────────────────────────
  filters: Filter[] = [];
  selectedFilter: number | null = null;
  currentYear = this.generalService.currentYear;

  // Modal shell
  isModalVisible = false;
  item: EventModelFullData | null = null;
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

  get canGoBack(): boolean {
    return this.modalNav.canGoBack();
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
    this.openModal(TypeList.Events, TypeActionModal.Create, null);
    // Si lo tienes en la facade/form:
    this.eventsFacade.prefillDate?.(iso);
  };

  onOpenEvent = (eventId: number) => {
    this.modalNav.push({
      typeModal: this.typeModal,
      action: this.currentModalAction,
      item: this.item,
    });

    this.eventsService
      .getEventById(eventId)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (ev) => this.openModal(TypeList.Events, TypeActionModal.Show, ev),
        error: (err) => console.error('Error cargando evento', err),
      });
  };

  onEditEvent = (eventId: number) => {
    this.modalNav.push({
      typeModal: this.typeModal,
      action: this.currentModalAction,
      item: this.item,
    });

    this.eventsService
      .getEventById(eventId)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (ev) => this.openModal(TypeList.Events, TypeActionModal.Edit, ev),
        error: (err) => console.error('Error cargando evento para editar', err),
      });
  };

  onDeleteEvent = (eventId: number) => {
    this.eventsFacade.deleteEvent(eventId);
  };

  // Si usas el mismo flujo de guardado que en EventsPage:
  sendFormEvent(event: { itemId: number; formData: FormData }): void {
    const currentItem = this.item;
    const newPeriodicId = event.formData.get('periodic_id');
    const oldPeriodicId = currentItem?.periodic_id ?? null;
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
