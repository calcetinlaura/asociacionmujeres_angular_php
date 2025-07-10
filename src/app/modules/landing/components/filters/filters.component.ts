
import { Component, EventEmitter, Input, OnInit, Output } from '@angular/core';
import { Filter } from 'src/app/core/models/general.model';
import { ButtonFilterComponent } from 'src/app/shared/components/buttons/button-filter/button-filter.component';

@Component({
    selector: 'app-filters',
    imports: [ButtonFilterComponent],
    templateUrl: './filters.component.html',
    styleUrl: './filters.component.css'
})
export class FiltersComponent implements OnInit {
  @Output() filterClicked: EventEmitter<string> = new EventEmitter<string>();
  @Input() filters: Filter[] = [];
  @Input() loadFirstFilter?: string | number;
  @Input() loadFilters? = true;
  selectedFilter: string | number = '';

  ngOnInit(): void {
    if (this.loadFilters) {
      // Verifica si hay un loadFirstFilter definido para poner color al botón de Agenda de ese año y NOVEDADES justo al cargar
      if (this.loadFirstFilter !== undefined) {
        // Asigna el loadFirstFilter si no es undefined
        this.selectedFilter = this.loadFirstFilter;
        this.filterSelected(this.selectedFilter);
      } else if (this.filters.length > 0) {
        // Si no hay loadFirstFilter, selecciona el primer filtro del array
        this.selectedFilter = this.filters[0].code; // Asumiendo que 'code' es lo que deseas guardar
      }
    } else {
      this.selectedFilter = '';
    }
  }

  filterSelected(filter: string | number): void {
    if (this.selectedFilter !== filter) {
      this.selectedFilter = filter;
      this.filterClicked.emit(filter.toString());
    } else {
      return;
    }
  }
}
