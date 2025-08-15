import { Pipe, PipeTransform } from '@angular/core';

@Pipe({ name: 'parseJson', standalone: true })
export class ParseJsonPipe implements PipeTransform {
  transform(value: any): any {
    if (typeof value === 'string') {
      try {
        return JSON.parse(value);
      } catch {
        return [];
      }
    }
    return value ?? [];
  }
}
