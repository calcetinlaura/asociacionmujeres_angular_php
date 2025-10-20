import { CommonModule } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  Input,
  LOCALE_ID,
  inject,
} from '@angular/core';
import {
  isDraft,
  isScheduled,
  parsePublishDate,
} from 'src/app/shared/utils/events.utils';

@Component({
  selector: 'app-event-publish-pill',
  standalone: true,
  imports: [CommonModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @if (isScheduled(event)) {
    <span
      class="inline-flex items-center gap-1 text-[10px]  px-2 py-0.5 rounded-[4px] bg-eventScheduler uppercase font-semibold"
      title="Fecha de publicación programada"
    >
      Programado · {{ scheduledDate | date : dateFmt : '' : appLocale }}
    </span>
    } @else if (isDraft(event)) {
    <span
      class="inline-flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-[4px] bg-eventDraft uppercase font-semibold"
    >
      Borrador
    </span>
    }
  `,
})
export class EventPublishPillComponent {
  private readonly defaultLocale = inject(LOCALE_ID);

  /** Objeto evento (debe contener: published, publish_day, publish_time) */
  @Input() event: any;

  /** Locale opcional; si no se pasa usa LOCALE_ID del app */
  @Input() locale?: string;

  /** Formato de fecha opcional (por defecto: "dd MMM y, HH:mm") */
  @Input() dateFmt = 'dd MMM y, HH:mm';

  get appLocale(): string {
    return this.locale ?? this.defaultLocale;
  }

  isDraft = (ev: any) => isDraft(ev);
  isScheduled = (ev: any) => isScheduled(ev);
  get scheduledDate(): Date | null {
    return parsePublishDate(this.event);
  }
}
