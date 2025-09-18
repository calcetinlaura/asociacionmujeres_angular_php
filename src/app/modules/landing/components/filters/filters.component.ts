import { Component, EventEmitter, Input, OnInit, Output } from '@angular/core';
import { Filter } from 'src/app/core/models/general.model';
import { ButtonFilterComponent } from 'src/app/shared/components/buttons/button-filter/button-filter.component';

@Component({
  selector: 'app-filters',
  imports: [ButtonFilterComponent],
  templateUrl: './filters.component.html',
  styleUrl: './filters.component.css',
})
export class FiltersComponent implements OnInit {
  @Output() filterClicked = new EventEmitter<string>();
  @Input() filters: Filter[] = [];
  @Input() loadFirstFilter?: string | number;
  @Input() loadFilters? = true;
  selectedFilter: string | number = '';

  ngOnInit(): void {
    if (this.loadFilters) {
      if (this.loadFirstFilter !== undefined) {
        this.selectedFilter = this.loadFirstFilter;
        this.filterClicked.emit(this.selectedFilter.toString()); // <-- EMITIR
      } else if (this.filters.length > 0) {
        this.selectedFilter = this.filters[0].code;
        this.filterClicked.emit(this.selectedFilter.toString()); // <-- EMITIR
      }
    } else {
      this.selectedFilter = '';
    }
  }

  filterSelected(filter: string | number): void {
    if (this.selectedFilter === filter) return;
    this.selectedFilter = filter;
    this.filterClicked.emit(filter.toString());
  }
}
