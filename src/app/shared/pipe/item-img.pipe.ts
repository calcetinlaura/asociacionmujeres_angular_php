import { Pipe, PipeTransform } from '@angular/core';
import { TypeList } from 'src/app/core/models/general.model';

@Pipe({
  name: 'itemImage',
  standalone: true,
})
export class ItemImagePipe implements PipeTransform {
  private basePath = '/uploads/img';

  transform(value: string, type?: TypeList): string {
    if (!value || typeof value !== 'string') {
      return type === TypeList.Recipes
        ? `${this.basePath}/receta.jpg`
        : `${this.basePath}/error.jpg`;
    }

    if (type === TypeList.Events) {
      // Extrae el año del nombre del archivo (ejemplo: 2024_evento.jpg)
      const match = value.match(/^(\d{4})_/);
      const yearFolder = match ? match[1] : '';

      return yearFolder
        ? `${this.basePath}/${type}/${yearFolder}/${value}`
        : `${this.basePath}/${type}/${value}`;
    }

    // Si no es un evento, usa la estructura normal
    return type
      ? `${this.basePath}/${type}/${value}`
      : `${this.basePath}/${value}`;
  }
}
