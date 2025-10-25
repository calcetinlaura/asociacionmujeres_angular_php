import { CommonModule, TitleCasePipe } from '@angular/common';
import {
  AfterViewInit,
  Component,
  EventEmitter,
  Input,
  OnChanges,
  OnDestroy,
  Output,
  SimpleChanges,
} from '@angular/core';
import { FormArray, FormGroup, ReactiveFormsModule } from '@angular/forms';
import { MatInputModule } from '@angular/material/input';
import { merge, of, Subscription } from 'rxjs';

@Component({
  standalone: true,
  selector: 'app-date-array-control',
  imports: [CommonModule, ReactiveFormsModule, TitleCasePipe, MatInputModule],
  templateUrl: './array-dates.component.html',
  styleUrls: ['./../../../../../../shared/components/form/form.component.css'],
})
export class DateArrayControlComponent
  implements OnChanges, AfterViewInit, OnDestroy
{
  @Input() formArray!: FormArray;
  @Input() submitted = false;
  @Output() remove = new EventEmitter<number>();

  monthGroups: {
    month: string;
    items: { index: number; formGroup: FormGroup; isNew: boolean }[];
  }[] = [];

  private sub?: Subscription;

  ngOnChanges(changes: SimpleChanges) {
    if (changes['formArray'] && this.formArray) {
      this.resubscribe();
    }
  }

  ngAfterViewInit() {
    if (this.formArray) this.resubscribe();
  }

  ngOnDestroy() {
    this.sub?.unsubscribe();
  }

  private resubscribe() {
    this.sub?.unsubscribe();
    // Pasada inicial + actualización por status y por valores
    this.sub = merge(
      of(null), // inicial
      this.formArray.statusChanges, // por si cambia a INVALID/VALID
      this.formArray.valueChanges // cambios en valores/longitud
    ).subscribe(() => this.updateGroupedData());
    // Asegura primera agrupación aunque nada haya emitido aún
    this.updateGroupedData();
  }

  private updateGroupedData() {
    const map = new Map<
      string,
      { index: number; formGroup: FormGroup; isNew: boolean }[]
    >();

    this.formArray.controls.forEach((ctrl, index) => {
      const fg = ctrl as FormGroup;
      const startDate = fg.get('start')?.value as string | null;

      const id = fg.get('id')?.value;
      const isNew = !id && id !== 0; // true si no hay id

      let monthLabel = 'Fecha'; // grupo para filas nuevas sin fecha
      if (startDate) {
        const [y, m, d] = startDate.split('-').map(Number);
        const date = new Date(
          Number.isFinite(y) ? y : 1970,
          (Number.isFinite(m) ? m : 1) - 1,
          Number.isFinite(d) ? d : 1
        );
        const monthName = date.toLocaleString('es-ES', { month: 'long' });
        monthLabel = `${monthName} ${date.getFullYear()}`;
      }

      if (!map.has(monthLabel)) map.set(monthLabel, []);
      map.get(monthLabel)!.push({ index, formGroup: fg, isNew });
    });

    const monthOrder = [
      'enero',
      'febrero',
      'marzo',
      'abril',
      'mayo',
      'junio',
      'julio',
      'agosto',
      'septiembre',
      'octubre',
      'noviembre',
      'diciembre',
    ];

    this.monthGroups = Array.from(map.entries())
      .map(([month, items]) => {
        // Orden dentro de cada grupo
        if (month === 'Fecha') {
          // Mantén el orden de inserción (index): el nuevo se verá al final
          items.sort((a, b) => a.index - b.index);
        } else {
          // Orden cronológico; si empata, por index para estabilidad
          items.sort((a, b) => {
            const da = new Date(
              a.formGroup.get('start')?.value || '9999-12-31'
            ).getTime();
            const db = new Date(
              b.formGroup.get('start')?.value || '9999-12-31'
            ).getTime();
            if (da !== db) return da - db;
            return a.index - b.index;
          });
        }
        return { month, items };
      })
      .sort((a, b) => {
        // “Fecha” SIEMPRE al final
        if (a.month === 'Fecha' && b.month !== 'Fecha') return 1;
        if (b.month === 'Fecha' && a.month !== 'Fecha') return -1;

        // Orden natural por año y mes
        const [ma, ya] = a.month.split(' ');
        const [mb, yb] = b.month.split(' ');
        const yd = (parseInt(ya) || 0) - (parseInt(yb) || 0);
        if (yd !== 0) return yd;

        return (
          monthOrder.indexOf((ma || '').toLowerCase()) -
          monthOrder.indexOf((mb || '').toLowerCase())
        );
      });
  }
}
