import { Pipe, PipeTransform } from '@angular/core'; // Asegúrate que la ruta es correcta
import {
  ManagementFilterPlaces,
  TypeFilterPlaces,
} from 'src/app/core/interfaces/place.interface';
import { Filter } from 'src/app/core/models/general.model';

@Pipe({
  name: 'filterTransformCode',
  standalone: true,
})
export class FilterTransformCodePipe implements PipeTransform {
  private filtersMap: { [key: string]: Filter[] } = {
    PlaceType: TypeFilterPlaces,
    PlaceManagement: ManagementFilterPlaces,
  };

  transform(
    value: string | number | null | undefined,
    filterKey: string
  ): string {
    if (value == null) return '—';

    const filterList = this.filtersMap[filterKey];
    if (!filterList) return value.toString(); // Si no existe el filtro, retorna el valor tal cual

    const match = filterList.find((item) => item.code === value.toString());
    return match?.name.toString() ?? value.toString();
  }
}
