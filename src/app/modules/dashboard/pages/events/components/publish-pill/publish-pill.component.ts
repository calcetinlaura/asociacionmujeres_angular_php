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
  isPublishedVisible,
  isScheduled,
  parsePublishDate,
} from 'src/app/shared/utils/events.utils';

@Component({
  selector: 'app-event-publish-pill',
  standalone: true,
  imports: [CommonModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './publish-pill.component.html',
  styleUrls: [],
})
export class EventPublishPillComponent {
  private readonly defaultLocale = inject(LOCALE_ID);
  @Input() published: boolean = false;
  @Input() publish_day: string | null = null;
  @Input() publish_time: string | null = null;
  @Input() showPublished: boolean = false;
  @Input() isTable: boolean = false;

  /** Locale y formato opcionales */
  @Input() locale?: string;
  @Input() dateFmt = 'dd MMM y, HH:mm';

  get appLocale(): string {
    return this.locale ?? this.defaultLocale;
  }

  /** Estado: borrador */
  get isDraftState(): boolean {
    return isDraft({
      published: this.published,
      publish_day: this.publish_day,
      publish_time: this.publish_time,
    });
  }

  /** Estado: programado */
  get scheduledDate(): Date | null {
    const parsed = parsePublishDate({
      publish_day: this.publish_day,
      publish_time: this.publish_time,
    });
    const scheduled = isScheduled({
      published: this.published,
      publish_day: this.publish_day,
      publish_time: this.publish_time,
    });
    return scheduled ? parsed : null;
  }

  /** Estado: publicado (visible ya) */
  get isPublishedState(): boolean {
    return isPublishedVisible({
      published: this.published,
      publish_day: this.publish_day,
      publish_time: this.publish_time,
    });
  }
}
