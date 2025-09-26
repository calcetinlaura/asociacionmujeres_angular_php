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

function isEmptyTime(v: unknown): boolean {
  if (typeof v !== 'string') return true;
  return v === '' || v === '00:00' || v === '00:00:00';
}

function toMinutes(v: string): number | null {
  if (!v) return null;
  const [hStr, mStr = '0'] = v.split(':');
  const h = Number(hStr);
  const m = Number(mStr);
  if (Number.isNaN(h) || Number.isNaN(m)) return null;
  return h * 60 + m;
}

export function timeRangeValidator(
  group: AbstractControl
): ValidationErrors | null {
  const periodic = !!group.get('periodic')?.value;
  if (periodic) return null; // no validar cabecera en periódicos

  const ts = group.get('time_start')?.value as string | null | undefined;
  const te = group.get('time_end')?.value as string | null | undefined;

  if (isEmptyTime(ts) || isEmptyTime(te)) return null;

  const sm = toMinutes(ts as string);
  const em = toMinutes(te as string);
  if (sm == null || em == null) return null;

  return em < sm ? { invalidTimeRange: true } : null;
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
/**
 * Permite varias fechas iguales siempre que la hora de inicio sea distinta.
 * Marca error { duplicateStartDatesAndTimes: true } si hay dos items con misma (start|time_start)
 */
export function uniqueDateTimeValidator(
  control: AbstractControl
): ValidationErrors | null {
  if (!(control instanceof FormArray)) return null;

  const seen = new Set<string>();
  for (const fg of control.controls) {
    const startRaw = fg.get('start')?.value as string | null;
    const tsRaw = (fg.get('time_start')?.value as string | null) || '';

    // normaliza fecha (YYYY-MM-DD) y tiempo (HH:mm -> HH:mm:00)
    const date = (startRaw || '').slice(0, 10);
    const [h = '00', m = '00'] = (tsRaw || '').split(':');
    const time = tsRaw ? `${h.padStart(2, '0')}:${m.padStart(2, '0')}:00` : '';

    if (!date) continue; // si no hay fecha, no entra en el set

    const key = `${date}|${time}`; // ← fecha + hora (hora vacía cuenta como una sola “ranura”)
    if (seen.has(key)) {
      return { duplicateStartDatesAndTimes: true };
    }
    seen.add(key);
  }
  return null;
}

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
  // ✅ Validador integral de “Público”
}
export function audienceValidatorFactory(
  shouldEnforce: () => boolean
): ValidatorFn {
  return (control: AbstractControl): ValidationErrors | null => {
    const enforce = shouldEnforce();

    const allPublic = control.get('allPublic')?.value === true;
    const hasAgeRec = control.get('hasAgeRecommendation')?.value === true;
    const hasRestr = control.get('hasRestriction')?.value === true;

    const primaryCount =
      (allPublic ? 1 : 0) + (hasAgeRec ? 1 : 0) + (hasRestr ? 1 : 0);

    const ages = control.get('ages')?.value as
      | {
          babies: boolean;
          kids: boolean;
          teens: boolean;
          adults: boolean;
          seniors: boolean;
        }
      | undefined;

    const restrGroup = control.get('restrictions');
    const membersOnly = restrGroup?.get('membersOnly')?.value === true;
    const womenOnly = restrGroup?.get('womenOnly')?.value === true;
    const other = restrGroup?.get('other')?.value === true;
    const otherText = (restrGroup?.get('otherText')?.value ?? '')
      .toString()
      .trim();

    const errors: Record<string, true> = {};

    // 🔕 Si aún no queremos forzar validación y no hay selección primaria, no marcamos error
    if (!enforce && primaryCount === 0) return null;

    // — Principal: obligatorio y exclusivo
    if (primaryCount === 0) errors['audienceRequired'] = true;
    if (primaryCount > 1) errors['audiencePrimaryConflict'] = true;

    // — Edad: al menos un rango
    if (hasAgeRec) {
      const anyAge = !!ages && Object.values(ages).some(Boolean);
      if (!anyAge) errors['ageRangeRequired'] = true;
    }

    // — Restricciones: una marcada; si 'other', texto requerido
    if (hasRestr) {
      const anyRestr = membersOnly || womenOnly || other;
      if (!anyRestr) errors['restrictionRequired'] = true;
      if (other && !otherText) errors['restrictionOtherTextRequired'] = true;
    }

    return Object.keys(errors).length ? errors : null;
  };
}
