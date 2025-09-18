import {
  AbstractControl,
  FormArray,
  ValidationErrors,
  ValidatorFn,
} from '@angular/forms';

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
//✅ Validador evento periódico más de una fecha
export const periodicHasMultipleDatesValidator: ValidatorFn = (
  control: AbstractControl
): ValidationErrors | null => {
  const isPeriodic = control.get('periodic')?.value;
  const repeatedDates = control.get('repeated_dates') as FormArray;

  if (!isPeriodic) return null;
  if (!repeatedDates || repeatedDates.length < 2) {
    return { periodicNeedsAtLeastTwoDates: true };
  }

  return null;
};
// ✅ Validador que no se repita el mismo pase
export const uniqueStartDatesValidator: ValidatorFn = (
  control: AbstractControl
): ValidationErrors | null => {
  if (!(control instanceof FormArray)) {
    return null;
  }

  const dateTimePairs = control.controls
    .map((fg) => {
      const date = fg.get('start')?.value;
      let time = fg.get('time_start')?.value;

      // Normalizar valores vacíos: si está vacío, lo tratamos como string vacío
      time = time ?? '';

      return { date, time };
    })
    .filter((pair) => !!pair.date); // solo si hay fecha

  const seen = new Set<string>();
  let hasDuplicate = false;

  for (const { date, time } of dateTimePairs) {
    const key = `${date}::${time}`;
    if (seen.has(key)) {
      hasDuplicate = true;
      break;
    }
    seen.add(key);
  }

  return hasDuplicate ? { duplicateStartDatesAndTimes: true } : null;
};
function coerceDate(v: unknown): Date | null {
  if (!v && v !== 0) return null;
  if (v instanceof Date) return isNaN(v.getTime()) ? null : v;
  // Para <input type="date"> viene como 'YYYY-MM-DD'
  const d = new Date(String(v));
  return isNaN(d.getTime()) ? null : d;
}

/**
 * Valida que la fecha esté entre [min, max), es decir:
 * - >= min (incluye el mínimo)
 * - <  max (excluye el máximo)
 * Es para que las facturas no sean anteriores a 2018 y mayores del día actual
 */
export function dateBetween(min: Date, max: Date): ValidatorFn {
  // Normalizamos límites al inicio del día
  const minUTC = new Date(min);
  minUTC.setHours(0, 0, 0, 0);
  const maxUTC = new Date(max);
  maxUTC.setHours(0, 0, 0, 0);

  return (control: AbstractControl): ValidationErrors | null => {
    const value = coerceDate(control.value);
    if (value === null) return null; // no valida vacío (deja a `required` decidir)

    const v = new Date(value);
    v.setHours(0, 0, 0, 0);

    if (v < minUTC) return { minDate: { requiredMin: minUTC, actual: v } };
    // EXCLUSIVO en el máximo: v debe ser < hoy
    if (v >= maxUTC)
      return { maxDate: { requiredMaxExclusive: maxUTC, actual: v } };
    return null;
  };
}
