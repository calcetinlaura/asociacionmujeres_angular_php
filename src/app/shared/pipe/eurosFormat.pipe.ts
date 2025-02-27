import { Pipe, PipeTransform } from '@angular/core';

@Pipe({
  name: 'eurosFormat',
  standalone: true,
})
export class EurosFormatPipe implements PipeTransform {
  transform(value: number | null | undefined): string | null {
    if (value === null || value === undefined) {
      return null; // Retorna null si el valor no es válido
    }

    return new Intl.NumberFormat('es-ES', {
      style: 'currency',
      currency: 'EUR',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(value);
  }
}
