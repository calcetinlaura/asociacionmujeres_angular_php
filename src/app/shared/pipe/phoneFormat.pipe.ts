import { Pipe, PipeTransform } from '@angular/core';

@Pipe({
  name: 'phoneFormat',
  standalone: true,
})
export class PhoneFormatPipe implements PipeTransform {
  transform(numero: string | null | undefined): string {
    if (!numero) return '';

    let valor = numero.replace(/\D/g, '');
    if (valor.length > 10) valor = valor.slice(0, 10);

    return valor.replace(
      /(\d{3})(\d{2})?(\d{2})?(\d{2})?/,
      (_, g1, g2, g3, g4) => {
        return [g1, g2, g3, g4].filter(Boolean).join(' ');
      }
    );
  }
}
