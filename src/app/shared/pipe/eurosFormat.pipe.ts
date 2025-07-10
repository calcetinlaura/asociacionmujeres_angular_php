import { Pipe, PipeTransform } from '@angular/core';

@Pipe({
  name: 'eurosFormat',
  standalone: true,
})
export class EurosFormatPipe implements PipeTransform {
  transform(value: number | string | null | undefined): string | null {
    if (value === null || value === undefined) return null;

    let numericValue: number;

    if (typeof value === 'string') {
      const normalized = value.replace(',', '.');
      numericValue = parseFloat(normalized);
    } else {
      numericValue = value;
    }

    if (isNaN(numericValue)) return value?.toString() ?? null;

    const formatted = new Intl.NumberFormat('es', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(numericValue);

    // Puedes personalizar la posición del símbolo aquí
    return `${formatted} €`; // o `€ ${formatted}` si prefieres al inicio
  }
}
