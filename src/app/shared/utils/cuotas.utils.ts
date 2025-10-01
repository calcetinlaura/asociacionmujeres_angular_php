// src/app/utils/cuotas.ts
import {
  CuotaModel,
  PaymentMethod,
} from 'src/app/core/interfaces/partner.interface';

export function isNumberArray(a: unknown): a is number[] {
  return Array.isArray(a) && a.every((x) => typeof x === 'number');
}

export function isCuotaModelArray(a: unknown): a is CuotaModel[] {
  return (
    Array.isArray(a) &&
    a.every(
      (x: any) => x && typeof x === 'object' && 'year' in x && 'paid' in x
    )
  );
}

/** Normaliza: number[] (legacy) -> CuotaModel[]; CuotaModel[] -> CuotaModel[] */
export function normalizeCuotas(a: unknown): CuotaModel[] {
  if (isNumberArray(a)) {
    return a.map((year) => ({
      year,
      paid: true,
      date_payment: null,
      method_payment: null,
    }));
  }
  if (isCuotaModelArray(a)) {
    return a.map((c) => ({
      year: Number(c.year),
      paid: !!c.paid,
      date_payment: c.date_payment ?? null,
      method_payment: (c.method_payment ?? null) as PaymentMethod | null,
    }));
  }
  return [];
}

/** Nº de años pagados */
export function countPaidYears(cuotas: CuotaModel[]): number {
  return cuotas.filter((c) => c.paid).length;
}

/** Último año pagado (o null) */
export function getLastPaidYear(cuotas: CuotaModel[]): number | null {
  const ys = cuotas.filter((c) => c.paid).map((c) => c.year);
  return ys.length ? Math.max(...ys) : null;
}

/** Texto “X años en la asociación” (basado en pagos o en longitud total, elige) */
export function getMembershipYearsText(
  cuotas: CuotaModel[],
  usePaidOnly = true
): string {
  const n = usePaidOnly ? countPaidYears(cuotas) : cuotas.length;
  return `${n} ${n === 1 ? 'año' : 'años'} en la asociación`;
}

/** Label bonito para method_payment */
export function methodLabel(m: PaymentMethod | null | undefined): string {
  if (m === 'cash') return 'Efectivo';
  if (m === 'domiciliation') return 'Domiciliación';
  return '—';
}

/** Formatea fecha ISO a dd MMM yyyy (o '—') */
export function formatDateFallback(d?: string | null): string {
  return d ? d : '—';
}
