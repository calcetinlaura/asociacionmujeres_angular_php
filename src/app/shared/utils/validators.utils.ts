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
