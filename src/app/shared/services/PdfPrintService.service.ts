import { Injectable } from '@angular/core';

declare var html2pdf: any;

@Injectable({ providedIn: 'root' })
export class PdfPrintService {
  printTableAsPdf(selector: string, filename: string): void {
    const element = document.getElementById(selector);
    if (!element) return;

    // Añadir clase al <body> para forzar los estilos
    document.body.classList.add('printing');

    const opt = {
      margin: 0.5,
      filename,
      image: { type: 'jpeg', quality: 0.98 },
      html2canvas: { scale: 2 },
      jsPDF: { unit: 'in', format: 'letter', orientation: 'landscape' },
    };

    html2pdf()
      .set(opt)
      .from(element)
      .save()
      .finally(() => {
        // Eliminar clase al terminar
        document.body.classList.remove('printing');
      });
  }
}
