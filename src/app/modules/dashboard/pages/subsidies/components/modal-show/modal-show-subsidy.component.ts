import { CommonModule } from '@angular/common';
import {
  Component,
  ElementRef,
  EventEmitter,
  Input,
  OnChanges,
  Output,
  SimpleChanges,
  ViewChild,
  inject,
} from '@angular/core';
import { MatIconModule } from '@angular/material/icon';
import { InvoicesFacade } from 'src/app/application/invoices.facade';
import { ProjectModelFullData } from 'src/app/core/interfaces/project.interface';
import {
  SUBSIDY_NAME_LABELS,
  SubsidyModelFullData,
} from 'src/app/core/interfaces/subsidy.interface';
import { TypeList } from 'src/app/core/models/general.model';
import { IconActionComponent } from 'src/app/shared/components/buttons/icon-action/icon-action.component';
import { PdfPrintComponent } from 'src/app/shared/components/pdf-print/pdf-print.component';
import { TableInvoicesComponent } from 'src/app/shared/components/table/table-invoice/table-invoice.component';
import { TextEditorComponent } from 'src/app/shared/components/text/text-editor/text-editor.component';
import { TextTitleComponent } from 'src/app/shared/components/text/text-title/text-title.component';
import { EurosFormatPipe } from 'src/app/shared/pipe/eurosFormat.pipe';

@Component({
  selector: 'app-modal-show-subsidy',
  standalone: true,
  imports: [
    CommonModule,
    TextTitleComponent,
    TextEditorComponent,
    EurosFormatPipe,
    MatIconModule,
    IconActionComponent,
    TableInvoicesComponent,
    PdfPrintComponent,
  ],
  templateUrl: './modal-show-subsidy.component.html',
  styleUrl: './modal-show-subsidy.component.css',
})
export class ModalShowSubsidyComponent implements OnChanges {
  private invoicesFacade = inject(InvoicesFacade);

  @Input() item!: SubsidyModelFullData;
  @Output() openProject = new EventEmitter<number>();
  @Output() openInvoice = new EventEmitter<number>();

  @ViewChild('pdfArea', { static: false }) pdfArea!: ElementRef<HTMLElement>;

  nameSubsidy = SUBSIDY_NAME_LABELS;
  typeModal: TypeList = TypeList.Subsidies;

  ngOnChanges(_: SimpleChanges): void {}

  // ────────────────────────────────
  //   UTILIDADES PRESUPUESTO
  // ────────────────────────────────
  getProjectTotalBudget(project: ProjectModelFullData): number {
    return (
      project.activities?.reduce((total, act) => {
        const budget = parseFloat(String(act.budget)) || 0;
        return total + budget;
      }, 0) || 0
    );
  }

  getSubsidyTotalBudget(subsidy: SubsidyModelFullData): number {
    return (
      subsidy.projects?.reduce((totalSubsidy, project) => {
        const totalProject =
          project.activities?.reduce((sum, act) => {
            return sum + (parseFloat(String(act.budget)) || 0);
          }, 0) || 0;
        return totalSubsidy + totalProject;
      }, 0) || 0
    );
  }

  // ────────────────────────────────
  //   DESCARGA DE FACTURAS
  // ────────────────────────────────
  downloadFilteredPdfs(includeProof: boolean = true): void {
    const data = this.item.invoices || [];
    if (!data.length) {
      alert('No hay facturas disponibles para descargar.');
      return;
    }

    // 👉 Llamada centralizada a la FACADE
    this.invoicesFacade.downloadFilteredPdfs(data, includeProof);
  }

  // ────────────────────────────────
  //   EVENTOS DE APERTURA
  // ────────────────────────────────
  onOpenInvoice(id: number) {
    if (id) this.openInvoice.emit(id);
  }

  onOpenProject(id: number) {
    if (id) this.openProject.emit(id);
  }
}
