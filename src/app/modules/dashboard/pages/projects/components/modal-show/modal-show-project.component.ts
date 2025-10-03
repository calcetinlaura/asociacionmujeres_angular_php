import { CommonModule } from '@angular/common';
import {
  Component,
  ElementRef,
  EventEmitter,
  inject,
  Input,
  Output,
  ViewChild,
} from '@angular/core';
import { Options } from 'html2pdf.js';
import { tap } from 'rxjs';
import { EventModelFullData } from 'src/app/core/interfaces/event.interface';
import { ProjectModelFullData } from 'src/app/core/interfaces/project.interface';
import { TypeList } from 'src/app/core/models/general.model';
import { EventsService } from 'src/app/core/services/events.services';
import { TableInvoicesComponent } from 'src/app/modules/dashboard/components/table/table-invoice/table-invoice.component';
import { IconActionComponent } from 'src/app/shared/components/buttons/icon-action/icon-action.component';
import { TextBackgroundComponent } from 'src/app/shared/components/text/text-background/text-background.component';
import { TextEditorComponent } from 'src/app/shared/components/text/text-editor/text-editor.component';
import { TextTitleComponent } from 'src/app/shared/components/text/text-title/text-title.component';
import { EurosFormatPipe } from '../../../../../../shared/pipe/eurosFormat.pipe';
import { ItemImagePipe } from '../../../../../../shared/pipe/item-img.pipe';

@Component({
  selector: 'app-modal-show-project',
  imports: [
    CommonModule,
    TextTitleComponent,
    TextEditorComponent,
    EurosFormatPipe,
    IconActionComponent,
    TableInvoicesComponent,
    TextBackgroundComponent,
    ItemImagePipe,
  ],
  templateUrl: './modal-show-project.component.html',
  styleUrls: ['./modal-show-project.component.css'],
})
export class ModalShowProjectComponent {
  private readonly eventsService = inject(EventsService);
  @Input() item!: ProjectModelFullData;
  @Output() openEvent = new EventEmitter<number>();
  @Output() openInvoice = new EventEmitter<number>();

  @ViewChild('pdfArea', { static: false }) pdfArea!: ElementRef<HTMLElement>;
  readonly typeEvent = TypeList.Events;
  typeModal: TypeList = TypeList.Projects;
  datesEquals = false;
  eventsOfMacro: EventModelFullData[] = [];

  ngOnInit(): void {
    if (this.item.id) {
      this.eventsService
        .getEventsByProject(this.item.id)
        .pipe(
          tap((events) => {
            this.eventsOfMacro = this.eventsService.sortEventsByDate(events);
          })
        )
        .subscribe();
    }
  }

  getProjectTotalBudget(project: ProjectModelFullData): number {
    return (
      project.activities?.reduce((total, activity) => {
        return total + (parseFloat(String(activity.budget)) || 0);
      }, 0) || 0
    );
  }
  getProjectInvoicesTotalBudget(project: ProjectModelFullData): number {
    return (
      project.invoices?.reduce((total, invoice) => {
        return total + (parseFloat(String(invoice.total_amount)) || 0);
      }, 0) || 0
    );
  }

  // ---------- IMPRIMIR / GUARDAR PDF ----------
  async printTableAsPdf(): Promise<void> {
    const html2pdf: any = (await import('html2pdf.js')).default;
    const element = this.pdfArea?.nativeElement;
    if (!element) return;

    // fuerza a number[] mutable (sin 'as const')
    const margin: number[] = [10, 10, 10, 10];

    const opt: Partial<Options> = {
      margin,
      filename: `${(this.item?.title ?? 'proyecto').replace(/\s+/g, '_')}_${
        this.item?.year ?? ''
      }.pdf`,
      image: { type: 'jpeg', quality: 0.98 },
      html2canvas: { scale: 2, useCORS: true, logging: false },
      pagebreak: { mode: ['css', 'legacy'] },
      jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' },
    };

    await html2pdf().from(element).set(opt).save();
  }
  onOpenEvent(id: number) {
    if (id) this.openEvent.emit(id);
  }
  onOpenInvoice(id: number) {
    console.log('ID INVOICE MODAL', id);
    if (id) this.openInvoice.emit(id);
  }
}
