import {
  ChangeDetectionStrategy,
  Component,
  EventEmitter,
  Input,
  OnChanges,
  OnInit,
  Output,
  Signal,
  SimpleChanges,
} from '@angular/core';
import { Filter } from 'src/app/core/interfaces/general.interface';
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
  @Input({ required: true }) filters!: Signal<Filter[]>;
  @Input({ required: true }) selected!: Signal<string | number>;

  @Output() filterClicked = new EventEmitter<string>();
  @Output() selectedChange = new EventEmitter<string | number>();

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
    this.filterClicked.emit(String(filter));
  }

  private coerce(v: unknown): string | number {
    if (v === null || v === undefined || v === '') return '';
    const n = Number(v);
    return Number.isFinite(n) ? n : String(v);
  }
}
