import {
  Component,
  EventEmitter,
  Input,
  OnChanges,
  OnInit,
  Output,
  SimpleChanges,
} from '@angular/core';
import { Filter } from 'src/app/core/models/general.model';
import { ButtonFilterComponent } from 'src/app/shared/components/buttons/button-filter/button-filter.component';

@Component({
  selector: 'app-filters',
  standalone: true,
  imports: [ButtonFilterComponent],
  templateUrl: './filters.component.html',
  styleUrl: './filters.component.css',
})
export class FiltersComponent implements OnInit, OnChanges {
  @Output() filterClicked = new EventEmitter<string>();
  @Input() filters: Filter[] = [];
  @Input() loadFirstFilter?: string | number;
  @Input() loadFilters? = true;

  selectedFilter: string | number = '';

  ngOnInit(): void {
    if (this.loadFilters) {
      if (this.loadFirstFilter !== undefined) {
        this.selectedFilter = this.coerce(this.loadFirstFilter);
        this.filterClicked.emit(String(this.selectedFilter)); // solo si loadFilters=true
      } else if (this.filters.length > 0) {
        this.selectedFilter = this.coerce(this.filters[0].code);
        this.filterClicked.emit(String(this.selectedFilter));
      }
    } else {
      // no emitimos; el padre controla
      this.selectedFilter = this.coerce(this.loadFirstFilter);
    }
  }

  ngOnChanges(changes: SimpleChanges): void {
    // Cuando el padre cambia el año (por URL/compartir), reflejarlo visualmente
    if (changes['loadFirstFilter'] && !this.loadFilters) {
      const next = this.coerce(changes['loadFirstFilter'].currentValue);
      if (next !== this.selectedFilter) {
        this.selectedFilter = next; // NO emitimos para evitar bucles
      }
    }
  }

  filterSelected(filter: string | number): void {
    if (this.selectedFilter === filter) return;
    this.selectedFilter = filter;
    this.filterClicked.emit(String(filter));
  }

  private coerce(v: unknown): string | number {
    if (v === null || v === undefined || v === '') return '';
    const n = Number(v);
    return Number.isFinite(n) ? n : String(v);
  }
}
