import { Injectable } from '@angular/core';

declare var html2pdf: any;

@Injectable({ providedIn: 'root' })
export class PdfPrintService {
  printTableAsPdf(
    tableSelector: string = 'table.mat-table',
    fileName = 'tabla.pdf'
  ): void {
    const table = document.querySelector(tableSelector);

    if (!table) {
      alert('No se encontró la tabla');
      return;
    }

    const options = {
      margin: 0.2,
      filename: fileName,
      image: { type: 'jpeg', quality: 0.98 },
      html2canvas: { scale: 2 },
      jsPDF: { unit: 'in', format: 'a4', orientation: 'landscape' },
    };

    html2pdf().set(options).from(table).save();
  }
}
