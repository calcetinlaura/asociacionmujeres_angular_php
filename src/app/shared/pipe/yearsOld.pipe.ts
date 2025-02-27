import { Pipe, PipeTransform } from '@angular/core';

@Pipe({
  name: 'yearsOld',
  standalone: true,
})
export class YearsOldPipe implements PipeTransform {
  transform(value: any): any {
    const fechaInicio: Date = new Date(value);
    const fechaHoy: Date = new Date();
    const diferenciaEnMilisegundos: number =
      fechaHoy.getTime() - fechaInicio.getTime();
    const milisegundosEnUnAño: number = 1000 * 60 * 60 * 24 * 365.25;
    const diferenciaEnAños: number =
      diferenciaEnMilisegundos / milisegundosEnUnAño;
    const diferenciaEnAñosRedondeada: number = Math.floor(diferenciaEnAños);
    return diferenciaEnAñosRedondeada;
  }
}
