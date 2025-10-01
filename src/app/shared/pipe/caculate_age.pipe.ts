import { Pipe, PipeTransform } from '@angular/core';
import { calcAge } from 'src/app/shared/utils/age.util';

@Pipe({ name: 'age', standalone: true, pure: true })
export class AgePipe implements PipeTransform {
  transform(dob: unknown, ref?: Date): number | null {
    return calcAge(dob, ref);
  }
}
