import { Pipe, PipeTransform } from '@angular/core';

@Pipe({ name: 'hasValue', standalone: true })
export class HasValuePipe implements PipeTransform {
  transform(value: any): boolean {
    return Array.isArray(value) ? value.length > 0 : !!value;
  }
}
