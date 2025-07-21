import { AbstractControl, FormArray, ValidationErrors } from '@angular/forms';

// ✅ Validador de rango de fechas (start < end)
export function dateRangeValidator(
  control: AbstractControl
): ValidationErrors | null {
  const start = control.get('start')?.value;
  const end = control.get('end')?.value;

  if (!start || !end) return null;

  return end < start ? { invalidDateRange: true } : null;
}

// ✅ Validador: fecha de inicio no en el pasado
export function futureDateValidator(
  control: AbstractControl
): { [key: string]: any } | null {
  const value = new Date(control.value);
  const today = new Date();

  if (isNaN(value.getTime())) return null; // no es una fecha válida
  return value < today ? { pastDateNotAllowed: true } : null;
}

// ✅ Validador de rango horario (time_start < time_end)
export function timeRangeValidator(
  control: AbstractControl
): ValidationErrors | null {
  const timeStart = control.get('time_start')?.value;
  const timeEnd = control.get('time_end')?.value;

  if (!timeStart || !timeEnd) return null;

  // Compara como strings 'HH:mm', funciona porque formato 24h respeta orden lexicográfico
  return timeEnd < timeStart ? { invalidTimeRange: true } : null;
}
export function uniqueStartDatesValidator(
  control: AbstractControl
): ValidationErrors | null {
  if (!(control instanceof FormArray)) {
    return null;
  }

  const dates = control.controls
    .map((fg) => fg.get('start')?.value)
    .filter((date) => !!date);

  const duplicates = dates.some((date, idx) => dates.indexOf(date) !== idx);

  return duplicates ? { duplicateStartDates: true } : null;
}
