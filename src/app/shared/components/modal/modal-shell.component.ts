import { CommonModule } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  EventEmitter,
  inject,
  Input,
  Output,
  SimpleChanges,
  ViewChild,
} from '@angular/core';
import { ModalFacade } from 'src/app/application/modal.facade';
import { TypeActionModal, TypeList } from 'src/app/core/models/general.model';
import { ModalRouterComponent } from './modal-router.component';
import { UiModalComponent } from './modal-ui.component';
import { ModalPdfComponent } from './pages/modal-pdf/modal-pdf.component';

@Component({
  standalone: true,
  selector: 'app-modal-shell',
  imports: [
    CommonModule,
    UiModalComponent,
    ModalRouterComponent,
    ModalPdfComponent,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './modal-shell.component.html',
})
export class ModalShellComponent<T> {
  readonly modalFacade = inject(ModalFacade);
  // === Inputs ===
  @Input({ required: true }) visible!: boolean;
  @Input({ required: true }) typeModal!: TypeList;
  @Input({ required: true }) action!: TypeActionModal;
  @Input() item: T | null = null;
  @Input() canGoBack = false;
  @Input() isDashboard = false;
  @Input() contentVersion = 0;

  // === Internal ===
  isOpen = true;
  pdfState = {
    open: false,
    url: '' as string,
    year: null as number | null,
    type: TypeList.Piteras as TypeList,
  };

  @ViewChild(UiModalComponent) ui?: UiModalComponent;
  @ViewChild('host', { read: ElementRef }) host?: ElementRef<HTMLElement>;

  // === Outputs ===
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
  @Output() sendFormEventReportData = new EventEmitter<{
    itemId: number;
    formData: FormData;
  }>();
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
  @Output() sendFormPodcastData = new EventEmitter<{
    itemId: number;
    formData: FormData;
  }>();

  // === Métodos ===

  // Método seguro para retroceder
  onBackModal() {
    if (this.modalFacade.canGoBack()) {
      // Retrocede a la modal anterior
      this.modalFacade.back();
    } else {
      // No hay historial: cerramos la modal
      this.onCloseModal();
    }
  }
  onCloseModal() {
    this.isOpen = false;
    this.modalFacade.close(); // 🔹 Cierra y limpia la pila
    this.close.emit();
  }
  onOpenPdfFromRouter(e: { url: string; year: number | null; type: TypeList }) {
    this.pdfState = { open: true, url: e.url, year: e.year, type: e.type };
  }

  onConfirmDelete(payload: { type: TypeList; id: number; item?: any }) {
    this.confirmDelete.emit(payload);
    this.onCloseModal();
  }

  private forceScrollTop(behavior: ScrollBehavior = 'auto') {
    queueMicrotask(() => {
      requestAnimationFrame(() => {
        const scroller = this.host?.nativeElement.querySelector<HTMLElement>(
          '.modal_body > section'
        );
        if (scroller) scroller.scrollTo({ top: 0, behavior });
      });
    });
  }

  ngOnChanges(ch: SimpleChanges) {
    if (ch['contentVersion'] || ch['item'] || ch['typeModal']) {
      this.forceScrollTop('smooth');
    }
  }
}
