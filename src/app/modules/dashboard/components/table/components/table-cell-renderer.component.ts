import { CommonModule } from '@angular/common';
import { Component, Input } from '@angular/core';
import { ColumnModel } from 'src/app/core/interfaces/column.interface';
import { CircleIndicatorComponent } from '../../circle-indicator/circle-indicator.component';

@Component({
  standalone: true,
  selector: 'app-table-cell-renderer',
  imports: [CommonModule, CircleIndicatorComponent],
  template: `
    <ng-container *ngIf="hasValue(value); else empty">
      {{ value }}
    </ng-container>
    <ng-template #empty>
      <app-circle-indicator [item]="false"></app-circle-indicator>
    </ng-template>
  `,
})
export class TableCellRendererComponent {
  @Input() value: any;
  @Input() column!: ColumnModel;

  hasValue(value: any): boolean {
    if (Array.isArray(value)) return value.length > 0;
    return value !== null && value !== undefined && value !== '';
  }
}
