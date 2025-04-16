import { AbstractControl, ValidationErrors } from '@angular/forms';

// Validador de rango de fechas (start < end)
export function dateRangeValidator(
  control: AbstractControl
): ValidationErrors | null {
  const start = control.get('start')?.value;
  const end = control.get('end')?.value;

  if (!start || !end) return null;

  return end < start ? { invalidDateRange: true } : null;
}

//Validar que la fecha de inicio no sea en el pasado
export function futureDateValidator(
  control: AbstractControl
): { [key: string]: any } | null {
  const value = new Date(control.value);
  const today = new Date();

  if (isNaN(value.getTime())) return null; // no es una fecha válida
  return value < today ? { pastDateNotAllowed: true } : null;
}
