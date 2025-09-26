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
import { AgentModel } from 'src/app/core/interfaces/agent.interface';
import { EventModelFullData } from 'src/app/core/interfaces/event.interface';
import { TypeList } from 'src/app/core/models/general.model';
import { EventsService } from 'src/app/core/services/events.services';

// UI/Utils
import { TotalsByYearTableComponent } from 'src/app/modules/dashboard/components/table/table-total-years/table-total-years.component';
import { ImageZoomOverlayComponent } from 'src/app/shared/components/image-zoom-overlay/image-zoom-overlay.component';
import { TextBackgroundComponent } from 'src/app/shared/components/text/text-background/text-background.component';
import { TextEditorComponent } from 'src/app/shared/components/text/text-editor/text-editor.component';
import { TextIconComponent } from 'src/app/shared/components/text/text-icon/text-icon.component';
import { TextTitleComponent } from 'src/app/shared/components/text/text-title/text-title.component';
import { ItemImagePipe } from 'src/app/shared/pipe/item-img.pipe';
import { PhoneFormatPipe } from 'src/app/shared/pipe/phoneFormat.pipe';

type AgentRole = 'ORGANIZADOR' | 'COLABORADOR' | 'PATROCINADOR';
type SortOrder = 'asc' | 'desc';

@Component({
  selector: 'app-modal-show-agent',
  standalone: true,
  imports: [
    CommonModule,
    TextBackgroundComponent,
    TextTitleComponent,
    TextIconComponent,
    TextEditorComponent,
    PhoneFormatPipe,
    ItemImagePipe,
    TotalsByYearTableComponent,
    ImageZoomOverlayComponent,
  ],
  templateUrl: './modal-show-agent.component.html',
  styleUrl: './modal-show-agent.component.css',
})
export class ModalShowAgentComponent implements OnChanges {
  private readonly eventsService = inject(EventsService);

  @Input() item!: AgentModel;

  // Filtros opcionales que puedes pasar desde el padre
  @Input() role?: AgentRole;
  @Input() order: SortOrder = 'asc';
  // Si quieres filtrar por un único año en la carga:
  @Input() year?: number;

  @Output() openEvent = new EventEmitter<number>();

  readonly typeModal = TypeList.Agents;
  readonly typeEvent = TypeList.Events;

  loading = false;
  eventsOfAgent: EventModelFullData[] = [];

  // Agrupaciones y totales
  eventsByYear = new Map<number, EventModelFullData[]>();
  totalEvents = 0;
  showZoom = false;

  // Si tuvieras importes por evento, podrías calcular totales; aquí solo contamos.

  ngOnChanges(changes: SimpleChanges): void {
    if (this.item?.id) {
      this.fetchEvents();
    }
  }

  private fetchEvents(): void {
    this.loading = true;
    this.eventsService
      .getEventsByAgent(this.item.id, {
        role: this.role,
        year: this.year,
        order: this.order,
      })
      .subscribe({
        next: (events) => {
          this.eventsOfAgent = (events ?? []).slice();
          this.groupByYear();
          this.loading = false;
        },
        error: () => {
          this.eventsOfAgent = [];
          this.eventsByYear.clear();
          this.totalEvents = 0;
          this.loading = false;
        },
      });
  }

  private groupByYear(): void {
    this.eventsByYear.clear();
    for (const ev of this.eventsOfAgent) {
      const y = ev.start ? new Date(ev.start).getFullYear() : 0;
      if (!this.eventsByYear.has(y)) this.eventsByYear.set(y, []);
      this.eventsByYear.get(y)!.push(ev);
    }
    // Ordenar internamente por fecha si lo deseas (asc)
    for (const [, arr] of this.eventsByYear) {
      arr.sort((a, b) => {
        const da = a.start ? new Date(a.start).getTime() : 0;
        const db = b.start ? new Date(b.start).getTime() : 0;
        return da - db;
      });
    }
    this.totalEvents = this.eventsOfAgent.length;
  }

  // Comparator para keyvalue (años descendentes)
  keyDesc = (a: { key: number }, b: { key: number }) =>
    Number(b.key) - Number(a.key);

  trackYear = (_: number, item: { key: number; value: EventModelFullData[] }) =>
    item.key;
  trackEvent = (_: number, ev: EventModelFullData) => ev.id;

  onOpenEvent(id: number) {
    if (id) this.openEvent.emit(id);
  }

  get eventsRows(): { year: number; count: number }[] {
    const rows = [...this.eventsByYear.entries()]
      .filter(([year]) => year > 0) // opcional: excluye registros sin fecha
      .map(([year, list]) => ({ year, count: list.length }));

    // orden descendente por año
    rows.sort((a, b) => Number(b.year) - Number(a.year));
    return rows;
  } /** Compara el agente actual con una persona de un evento (por id y, si no hay, por nombre) */
  private isSameAgent(
    a: { id?: number | string; name?: string },
    b: { id?: number | string; name?: string }
  ) {
    if (a?.id != null && b?.id != null) return String(a.id) === String(b.id);
    const an = (a?.name ?? '').trim().toLowerCase();
    const bn = (b?.name ?? '').trim().toLowerCase();
    return !!an && !!bn && an === bn;
  }

  /** Devuelve los roles (en mayúsculas) que tiene el agente actual en ese evento */
  rolesForAgent(ev: any): string[] {
    const me = { id: this.item?.id, name: this.item?.name };

    const hasOrganizer =
      Array.isArray(ev?.organizer) &&
      ev.organizer.some((p: any) => this.isSameAgent(p, me));
    const hasCollaborator =
      Array.isArray(ev?.collaborator) &&
      ev.collaborator.some((p: any) => this.isSameAgent(p, me));
    const hasSponsor =
      Array.isArray(ev?.sponsor) &&
      ev.sponsor.some((p: any) => this.isSameAgent(p, me));

    const roles: string[] = [];
    if (hasOrganizer) roles.push('ORGANIZADOR');
    if (hasCollaborator) roles.push('COLABORADOR');
    if (hasSponsor) roles.push('PATROCINADOR');
    return roles;
  }
  openZoom() {
    this.showZoom = true;
  }
  closeZoom() {
    this.showZoom = false;
  }
}
