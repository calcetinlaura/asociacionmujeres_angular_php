import { CommonModule } from '@angular/common';
import {
  Component,
  DestroyRef,
  ElementRef,
  OnInit,
  ViewChild,
  inject,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormsModule } from '@angular/forms';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { filter, finalize, map, of, switchMap, take, tap } from 'rxjs';

import { EventsFacade } from 'src/app/application/events.facade';
import { FiltersFacade } from 'src/app/application/filters.facade';
import { MacroeventsFacade } from 'src/app/application/macroevents.facade';
import { ModalFacade } from 'src/app/application/modal.facade';

import { EventModelFullData } from 'src/app/core/interfaces/event.interface';
import { MacroeventModelFullData } from 'src/app/core/interfaces/macroevent.interface';
import { TypeActionModal, TypeList } from 'src/app/core/models/general.model';

import { GeneralService } from 'src/app/core/services/generalService.service';
import { PdfPrintService } from 'src/app/core/services/PdfPrintService.service';

import { CalendarComponent } from 'src/app/shared/components/calendar/calendar.component';
import { DashboardHeaderComponent } from 'src/app/shared/components/dashboard-header/dashboard-header.component';
import { FiltersComponent } from 'src/app/shared/components/filters/filters.component';
import { ModalShellComponent } from 'src/app/shared/components/modal/modal-shell.component';
import { SpinnerLoadingComponent } from 'src/app/shared/components/spinner-loading/spinner-loading.component';
import { StickyZoneComponent } from 'src/app/shared/components/sticky-zone/sticky-zone.component';
import { sortByDate } from 'src/app/shared/utils/facade.utils';

type MultiEventsPayload = { date: Date; events: any[] };

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
  private readonly destroyRef = inject(DestroyRef);
  readonly eventsFacade = inject(EventsFacade);
  private readonly macroeventsFacade = inject(MacroeventsFacade);
  private readonly generalService = inject(GeneralService);
  private readonly modalFacade = inject(ModalFacade);
  private readonly pdfPrintService = inject(PdfPrintService);
  readonly filtersFacade = inject(FiltersFacade);

  currentYear = this.generalService.currentYear;

  // Modal
  readonly modalVisibleSig = this.modalFacade.isVisibleSig;
  readonly currentModalTypeSig = this.modalFacade.typeSig;
  readonly currentModalActionSig = this.modalFacade.actionSig;
  readonly currentItemSig = this.modalFacade.itemSig;
  readonly canGoBackSig = this.modalFacade.canGoBackSig;

  readonly events$ = this.eventsFacade.allEvents$.pipe(
    map((events) => sortByDate(events ?? []))
  );

  @ViewChild('printArea', { static: false })
  printArea!: ElementRef<HTMLElement>;

  ngOnInit(): void {
    this.filtersFacade.loadFiltersFor(TypeList.Events, '', 2018);
  }

  ngAfterViewInit(): void {
    setTimeout(() => this.filterSelected(this.currentYear.toString()));
  }

  // ──────────────────────────────────────────────
  // Filtros y carga
  // ──────────────────────────────────────────────
  filterSelected(filter: string): void {
    const year = Number(filter);
    if (isNaN(year)) return;

    this.currentYear = year;
    this.filtersFacade.selectFilter(filter);
    this.eventsFacade.applyFilterWord('');
    this.eventsFacade.loadDashboardAllNotGrouped(year);
  }

  get filterYearNumber(): number | null {
    const val = this.filtersFacade.selectedSig();
    const num = Number(val);
    return isNaN(num) ? null : num;
  }

  get selectedFilter(): string | number {
    return this.filtersFacade.selectedSig();
  }

  get hasSelectedYear(): boolean {
    return !!this.filtersFacade.selectedSig();
  }

  // ──────────────────────────────────────────────
  // Modal helpers
  // ──────────────────────────────────────────────
  onCreateEventAtDate(iso: string): void {
    this.modalFacade.open(TypeList.Events, TypeActionModal.Create, null);
    this.eventsFacade.prefillDate?.(iso);
  }

  onOpenEvent(eventId: number): void {
    this.eventsFacade.loadEventById(eventId);

    this.eventsFacade.selectedEvent$
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        filter((e): e is EventModelFullData => !!e),
        take(1),
        tap((event) =>
          this.modalFacade.open(TypeList.Events, TypeActionModal.Show, event)
        )
      )
      .subscribe();
  }

  onEditEvent(eventId: number): void {
    this.eventsFacade
      .getEventByIdOnce(eventId)
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        tap((event) =>
          this.modalFacade.open(
            TypeList.Events,
            TypeActionModal.Edit,
            event as EventModelFullData
          )
        )
      )
      .subscribe();
  }

  onOpenMacroEvent(macroId: number): void {
    if (!macroId) return;

    this.macroeventsFacade.loadMacroeventById(macroId); // maneja loader/errores dentro

    this.macroeventsFacade.selectedMacroevent$
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        filter((m): m is MacroeventModelFullData => !!m), // ignora null inicial
        take(1), // solo la primera emisión válida
        tap((macro) =>
          this.modalFacade.open(
            TypeList.Macroevents,
            TypeActionModal.Show,
            macro
          )
        )
      )
      .subscribe();
  }

  onOpenMulti(payload: MultiEventsPayload): void {
    this.modalFacade.open(TypeList.MultiEvents, TypeActionModal.Show, payload);
  }

  onBackModal(): void {
    this.modalFacade.back();
  }

  onCloseModal(): void {
    this.modalFacade.close();
  }

  // ──────────────────────────────────────────────
  // CRUD
  // ──────────────────────────────────────────────
  onDeleteEvent(eventId: number): void {
    this.eventsFacade.deleteEvent(eventId);
  }

  private isEventItem(x: any): x is EventModelFullData {
    return !!x && typeof x === 'object' && 'id' in x && 'start' in x;
  }

  sendFormEvent(event: { itemId: number; formData: FormData }): void {
    const currentItem = this.currentItemSig();
    const newPeriodicId = event.formData.get('periodic_id');
    const oldPeriodicId = this.isEventItem(currentItem)
      ? currentItem.periodic_id ?? null
      : null;

    const isRepeatedToUnique = !!oldPeriodicId && !newPeriodicId;

    const req$ = event.itemId
      ? this.eventsFacade.editEvent(event.formData)
      : this.eventsFacade.addEvent(event.formData);

    req$
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        switchMap(() =>
          isRepeatedToUnique && oldPeriodicId
            ? this.eventsFacade.deleteEventsByPeriodicIdExcept(
                oldPeriodicId,
                event.itemId
              )
            : of(null)
        ),
        finalize(() => this.modalFacade.close())
      )
      .subscribe();
  }

  // ──────────────────────────────────────────────
  // PDF opcional
  // ──────────────────────────────────────────────
  async printCalendarAsPdf(): Promise<void> {
    if (!this.printArea) return;
    await this.pdfPrintService.printElementAsPdf(this.printArea, {
      filename: 'calendario.pdf',
      preset: 'compact',
      orientation: 'landscape',
      format: 'a4',
      margins: [5, 5, 5, 5],
    });
  }
}
