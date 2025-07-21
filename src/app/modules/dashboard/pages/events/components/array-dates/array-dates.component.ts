import { CommonModule, TitleCasePipe } from '@angular/common';
import {
  AfterViewInit,
  Component,
  EventEmitter,
  Input,
  OnChanges,
  Output,
  SimpleChanges,
} from '@angular/core';
import { FormArray, FormGroup, ReactiveFormsModule } from '@angular/forms';
import { MatInputModule } from '@angular/material/input';
import { startWith } from 'rxjs/operators';
@Component({
  standalone: true,
  selector: 'app-date-array-control',
  imports: [CommonModule, ReactiveFormsModule, TitleCasePipe, MatInputModule],
  templateUrl: './array-dates.component.html',
  styleUrls: ['../../../../components/form/form.component.css'],
})
export class DateArrayControlComponent implements OnChanges, AfterViewInit {
  @Input() formArray!: FormArray;
  @Input() submitted: boolean = false;
  @Output() remove = new EventEmitter<number>();

  monthGroups: {
    month: string;
    items: { index: number; formGroup: FormGroup; isNew: boolean }[];
  }[] = [];

  ngOnChanges(changes: SimpleChanges) {
    if (changes['formArray'] && this.formArray) {
      this.subscribeToArrayChanges();
    }
  }

  ngAfterViewInit() {
    if (this.formArray) {
      this.subscribeToArrayChanges();
    }
  }

  private subscribeToArrayChanges() {
    this.formArray.statusChanges
      .pipe(startWith(null))
      .subscribe(() => this.updateGroupedData());
  }

  private updateGroupedData() {
    const map = new Map<
      string,
      { index: number; formGroup: FormGroup; isNew: boolean }[]
    >();

    this.formArray.controls.forEach((ctrl, index) => {
      const fg = ctrl as FormGroup;
      const startDate = fg.get('start')?.value;

      const id = fg.get('id')?.value;
      console.log(`Item index ${index}, id=${id}`);
      const isNew = !id || id === 0 || id === undefined;

      let monthLabel = 'Fecha';
      if (startDate) {
        const [year, month, day] = startDate.split('-').map(Number);
        const date = new Date(year, month - 1, day);
        const monthName = date.toLocaleString('es-ES', { month: 'long' });
        monthLabel = `${monthName} ${year}`; // 👈 Incluir el año en la etiqueta
      }

      if (!map.has(monthLabel)) {
        map.set(monthLabel, []);
      }
      map.get(monthLabel)!.push({ index, formGroup: fg, isNew });
    });

    const sortedMonthGroups = Array.from(map.entries())
      .map(([month, items]) => ({
        month, // Esto será algo como "Abril 2024"
        items: items.sort((a, b) => {
          const dateA = new Date(a.formGroup.get('start')?.value || 0);
          const dateB = new Date(b.formGroup.get('start')?.value || 0);
          return dateA.getTime() - dateB.getTime();
        }),
      }))
      .sort((a, b) => {
        // Extraemos año y mes para comparar
        const [monthAName, yearA] = a.month.split(' ');
        const [monthBName, yearB] = b.month.split(' ');

        const yearDiff = parseInt(yearA) - parseInt(yearB);
        if (yearDiff !== 0) return yearDiff;

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
        return (
          monthOrder.indexOf(monthAName.toLowerCase()) -
          monthOrder.indexOf(monthBName.toLowerCase())
        );
      });

    this.monthGroups = sortedMonthGroups;
  }
}
