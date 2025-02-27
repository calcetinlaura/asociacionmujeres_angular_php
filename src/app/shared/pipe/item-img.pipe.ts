import { Pipe, PipeTransform } from '@angular/core';
import { TypeList } from 'src/app/core/models/general.model';

@Pipe({
  name: 'itemImage',
  standalone: true,
})
export class ItemImagePipe implements PipeTransform {
  private basePath = 'assets/img';

  transform(value: string, type?: TypeList): string {
    if (!value || typeof value !== 'string') {
      if (type === TypeList.Recipes) {
        return `${this.basePath}/receta.jpg`;
      } else {
        return `${this.basePath}/error.jpg`;
      }
    } else {
      if (type) {
        return `${this.basePath}/${type}/${value}`;
      } else {
        return `${this.basePath}/${value}`;
      }
    }
  }
}
