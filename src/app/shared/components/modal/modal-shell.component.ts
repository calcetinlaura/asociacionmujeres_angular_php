import { CommonModule } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  EventEmitter,
  Input,
  OnChanges,
  OnDestroy,
  OnInit,
  Output,
  SimpleChanges,
} from '@angular/core';
import { TypeActionModal, TypeList } from 'src/app/core/models/general.model';
import { ModalComponent } from 'src/app/shared/components/modal/modal.component';

@Component({
  standalone: true,
  selector: 'app-modal-shell',
  imports: [CommonModule, ModalComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `<div class="modal-shell-wrapper">
    @if (visible) {
    <app-modal
      [item]="item"
      [contentVersion]="contentVersion"
      [typeModal]="typeModal"
      [typePage]="typeModal"
      [action]="action"
      [canGoBack]="canGoBack"
      [isDashboard]="isDashboard"
      (back)="back.emit()"
      (closeModal)="close.emit()"
      (confirmDelete)="confirmDelete.emit($event)"
      (openEvent)="openEvent.emit($event)"
      (openMacroevent)="openMacroevent.emit($event)"
      (openProject)="openProject.emit($event)"
      (openInvoice)="openInvoice.emit($event)"
      (openPdf)="openPdf.emit($event)"
      (viewEvent)="viewEvent.emit($event)"
      (editEvent)="editEvent.emit($event)"
      (removeEvent)="removeEvent.emit($event)"
      (addEvent)="addEvent.emit($event)"
      (sendFormEventData)="sendFormEventData.emit($event)"
      (sendFormMacroeventData)="sendFormMacroeventData.emit($event)"
      (sendFormBookData)="sendFormBookData.emit($event)"
      (sendFormMovieData)="sendFormMovieData.emit($event)"
      (sendFormAgentData)="sendFormAgentData.emit($event)"
      (sendFormArticleData)="sendFormArticleData.emit($event)"
      (sendFormRecipeData)="sendFormRecipeData.emit($event)"
      (sendFormPiteraData)="sendFormPiteraData.emit($event)"
      (sendFormPartnerData)="sendFormPartnerData.emit($event)"
      (sendFormInvoiceData)="sendFormInvoiceData.emit($event)"
      (sendFormSubsidyData)="sendFormSubsidyData.emit($event)"
      (sendFormCreditorData)="sendFormCreditorData.emit($event)"
      (sendFormPlaceData)="sendFormPlaceData.emit($event)"
      (sendFormProjectData)="sendFormProjectData.emit($event)"
      (sendFormPodcastData)="sendFormPodcastData.emit($event)"
    />
    }
  </div> `,
})
export class ModalShellComponent<T> implements OnInit, OnChanges, OnDestroy {
  @Input({ required: true }) visible!: boolean;
  @Input({ required: true }) typeModal!: TypeList;
  @Input({ required: true }) action!: TypeActionModal;
  @Input() item: T | null = null;
  @Input() canGoBack = false;
  @Input() isDashboard = true;
  @Input() contentVersion = 0;

  @Output() back = new EventEmitter<void>();
  @Output() close = new EventEmitter<void>();
  @Output() confirmDelete = new EventEmitter<any>();
  @Output() openEvent = new EventEmitter<number>();
  @Output() openMacroevent = new EventEmitter<number>();
  @Output() openInvoice = new EventEmitter<number>();
  @Output() openProject = new EventEmitter<number>();
  @Output() openPdf = new EventEmitter<{
    url: string;
    year: number | null;
    type: TypeList;
  }>();
  @Output() viewEvent = new EventEmitter<number>();
  @Output() editEvent = new EventEmitter<number>();
  @Output() removeEvent = new EventEmitter<number>();
  @Output() addEvent = new EventEmitter<string>();
  @Output() sendFormEventData = new EventEmitter<any>();
  @Output() sendFormMacroeventData = new EventEmitter<any>();
  @Output() sendFormBookData = new EventEmitter<any>();
  @Output() sendFormMovieData = new EventEmitter<any>();
  @Output() sendFormAgentData = new EventEmitter<any>();
  @Output() sendFormArticleData = new EventEmitter<{
    itemId: number;
    formData: FormData;
  }>();
  @Output() sendFormRecipeData = new EventEmitter<{
    itemId: number;
    formData: FormData;
  }>();
  @Output() sendFormPodcastData = new EventEmitter<{
    itemId: number;
    formData: FormData;
  }>();
  @Output() sendFormPiteraData = new EventEmitter<{
    itemId: number;
    formData: FormData;
  }>();
  @Output() sendFormPartnerData = new EventEmitter<{
    itemId: number;
    formData: FormData;
  }>();
  @Output() sendFormPlaceData = new EventEmitter<{
    itemId: number;
    formData: FormData;
  }>();
  @Output() sendFormProjectData = new EventEmitter<{
    itemId: number;
    formData: FormData;
  }>();
  @Output() sendFormCreditorData = new EventEmitter<{
    itemId: number;
    formData: FormData;
  }>();
  @Output() sendFormInvoiceData = new EventEmitter<{
    itemId: number;
    formData: FormData;
  }>();
  @Output() sendFormSubsidyData = new EventEmitter<{
    itemId: number;
    formData: FormData;
  }>();

  // Logs de ciclo de vida
  ngOnInit() {
    console.log(
      '%c🧱 ModalShellComponent → ngOnInit',
      'color: lightgreen; font-weight:bold'
    );
  }

  ngOnChanges(changes: SimpleChanges) {
    console.log(
      '%c🧱 ModalShellComponent → ngOnChanges',
      'color: lightblue; font-weight:bold',
      changes
    );
  }

  ngOnDestroy() {
    console.log(
      '%c💥 ModalShellComponent → ngOnDestroy',
      'color: red; font-weight:bold'
    );
  }
}
