import { Pipe, PipeTransform } from '@angular/core';

@Pipe({
  name: 'dateFormatForm',
  standalone: true,
})
export class DateFormatPipe implements PipeTransform {
  transform(
    value: Date | string | null | undefined,
    format: string = 'YYYY-MM-DD'
  ): string {
    if (value === undefined || value === null) return '';

    const date = value instanceof Date ? value : new Date(value);
    if (isNaN(date.getTime())) return '';

    const year = date.getFullYear();
    const month = `0${date.getMonth() + 1}`.slice(-2);
    const day = `0${date.getDate()}`.slice(-2);

    if (format === 'YYYY-MM-DD') {
      return `${year}-${month}-${day}`;
    }

    // Default fallback
    return date.toISOString().substring(0, 10);
  }
}
@Pipe({ name: 'hms', standalone: true })
export class HmsPipe implements PipeTransform {
  transform(value: number | string | null | undefined): string {
    if (value == null) return '00:00:00';

    // Acepta segundos como número o como string; si ya viene "HH:MM:SS", lo deja.
    if (typeof value === 'string') {
      if (/^\d{1,2}:\d{2}:\d{2}$/.test(value)) return value; // ya formateado
      if (!/^\d+$/.test(value)) return '00:00:00';
    }

    const total = Math.max(0, Math.floor(Number(value)));
    const hh = Math.floor(total / 3600);
    const mm = Math.floor((total % 3600) / 60);
    const ss = total % 60;

    const pad = (n: number) => n.toString().padStart(2, '0');
    return `${pad(hh)}:${pad(mm)}:${pad(ss)}`;
  }
}
