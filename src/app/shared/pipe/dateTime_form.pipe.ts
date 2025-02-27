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
