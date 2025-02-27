import { Pipe, PipeTransform } from '@angular/core';

@Pipe({
  name: 'dateTime',
  standalone: true,
})
export class DateTimePipe implements PipeTransform {
  transform(value: any): any {
    let time = value.toString();
    time = time.slice(0, -3);
    return { time };
  }
}
