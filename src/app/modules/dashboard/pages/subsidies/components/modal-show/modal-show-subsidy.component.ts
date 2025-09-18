import { CommonModule } from '@angular/common';
import {
  Component,
  ElementRef,
  inject,
  Input,
  OnChanges,
  SimpleChanges,
  ViewChild,
} from '@angular/core';
import { MatIconModule } from '@angular/material/icon';
import { ProjectModelFullData } from 'src/app/core/interfaces/project.interface';
import { SubsidyModelFullData } from 'src/app/core/interfaces/subsidy.interface';
import { TypeList } from 'src/app/core/models/general.model';
import { InvoicesService } from 'src/app/core/services/invoices.services';
import { PdfPrintComponent } from 'src/app/modules/dashboard/components/pdf-print/pdf-print.component';
import { TableInvoicesComponent } from 'src/app/modules/dashboard/components/table/table-invoice/table-invoice.component';
import { IconActionComponent } from 'src/app/shared/components/buttons/icon-action/icon-action.component';
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
  private invoicesService = inject(InvoicesService);

  @Input() item!: SubsidyModelFullData;
  @ViewChild('pdfArea', { static: false }) pdfArea!: ElementRef<HTMLElement>;

  typeModal: TypeList = TypeList.Subsidies;

  ngOnChanges(_: SimpleChanges): void {}

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

  downloadFilteredPdfs(includeProof: boolean = true): void {
    const data = this.item.invoices || [];

    this.invoicesService
      .downloadInvoicesZipFromData(data, {
        includeProof, // true: invoice+proof | false: solo invoice
        filename: includeProof ? 'documentos.zip' : 'facturas.zip',
      })
      .subscribe({
        error: (e) => {
          if (e?.message === 'NO_FILES') {
            alert('No hay PDFs para descargar.');
          } else {
            console.error('💥 Error al descargar ZIP:', e);
            alert('Error al descargar el ZIP. Revisa la consola.');
          }
        },
      });
  }
}
