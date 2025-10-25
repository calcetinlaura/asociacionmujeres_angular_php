import {
  ChangeDetectionStrategy,
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
  styleUrls: ['./filters.component.css'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class FiltersComponent implements OnInit, OnChanges {
  /** Lista de filtros a pintar */
  @Input() filters: Filter[] = [];
  /** Valor controlado desde el padre */
  @Input() selected: string | number | null = null;
  /** Two-way binding opcional: [(selected)] */
  @Output() selectedChange = new EventEmitter<string | number>();
  /** Evento clásico para pedir al padre que cargue datos */
  @Output() filterClicked = new EventEmitter<string>();

  /** Selección mostrada (sólo UI). No auto-emite en ngOnInit. */
  selectedFilter: string | number = '';

  ngOnInit(): void {
    this.selectedFilter = this.coerce(this.selected);
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['selected']) {
      this.selectedFilter = this.coerce(changes['selected'].currentValue);
    }
  }

  filterSelected(filter: string | number): void {
    if (this.selectedFilter === filter) return;
    this.selectedFilter = filter;
    // two-way
    this.selectedChange.emit(filter);
    // notifica al padre para que cargue datos
    this.filterClicked.emit(String(filter));
  }

  private coerce(v: unknown): string | number {
    if (v === null || v === undefined || v === '') return '';
    const n = Number(v);
    return Number.isFinite(n) ? n : String(v);
  }
}
