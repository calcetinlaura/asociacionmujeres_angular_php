import { Pipe, PipeTransform } from '@angular/core';
import { TypeList } from 'src/app/core/models/general.model';

@Pipe({
  name: 'itemImage',
  standalone: true,
})
export class ItemImagePipe implements PipeTransform {
  private basePath = '/uploads/img';
  private defaultImagesFallback = 'assets/img/error.jpg';
  private defaultImages: { [key in TypeList]?: string } = {
    [TypeList.Recipes]: `${this.basePath}/receta.jpg`,
    [TypeList.Partners]: 'assets/img/mujer.jpg',
  };

  transform(value: string, type?: TypeList): string {
    // Si no hay valor válido, usar imagen por defecto
    if (!value || typeof value !== 'string') {
      return this.defaultImages[type!] || this.defaultImagesFallback;
    }

    // Si es un evento: buscar si contiene el año en el nombre del archivo (ej. 2024_nombre.jpg)
    if (type === TypeList.Events || type === TypeList.Macroevents) {
      const match = value.match(/^(\d{4})_/);
      const year = match?.[1];
      return year
        ? `${this.basePath}/${type}/${year}/${value}`
        : `${this.basePath}/${type}/${value}`;
    }

    // Para cualquier otro tipo con valor válido
    return type
      ? `${this.basePath}/${type}/${value}`
      : this.defaultImages[type!] || this.defaultImagesFallback;
  }
}
