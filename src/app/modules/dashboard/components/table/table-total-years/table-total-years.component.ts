import { CommonModule } from '@angular/common';
import { Component, input } from '@angular/core';

export type YearRow = {
  year: number | string;
  count: number;
  amount?: number; // opcional: sólo si hay columna de importe
};

@Component({
  selector: 'app-table-total-years',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './table-total-years.component.html',
  styleUrls: ['./table-total-years.component.css'],
})
export class TotalsByYearTableComponent {
  // Filas (ya ordenadas como quieras)
  rows = input<YearRow[]>([]);
  // ¿Mostrar la columna de importe?
  hasAmount = input<boolean>(false);
  // Totales de la última fila
  totalCount = input<number>(0);
  totalAmount = input<number | null>(null);

  trackRow = (_: number, r: YearRow) => r.year;
}
