import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Input, Output } from '@angular/core';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatMenuModule } from '@angular/material/menu';
import { ColumnModel } from 'src/app/core/interfaces/column.interface';
import { ButtonComponent } from 'src/app/shared/components/buttons/button/button.component';

@Component({
  standalone: true,
  selector: 'app-column-menu',
  imports: [CommonModule, MatMenuModule, MatCheckboxModule, ButtonComponent],
  template: `
    <app-button [buttonText]="'Filtrar columnas'" [menu]="menu"></app-button>
    <mat-menu #menu="matMenu">
      @for (c of columns; track $index) {
      <button mat-menu-item>
        <mat-checkbox
          [checked]="visibility[c.key]"
          (change)="toggle.emit(c.key)"
          >{{ c.title }}</mat-checkbox
        >
      </button>
      }
    </mat-menu>
  `,
})
export class ColumnMenuComponent {
  @Input({ required: true }) columns!: ColumnModel[];
  @Input({ required: true }) visibility!: Record<string, boolean>;
  @Output() toggle = new EventEmitter<string>();
}
