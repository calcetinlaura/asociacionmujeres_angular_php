import {
  InvoiceModelFullData,
  InvoicePdf,
} from 'src/app/core/interfaces/invoice.interface';
import { includesNormalized, toSearchKey } from './text.utils';

/** Copia ordenada por título (A→Z, case-insensitive). */
export const sortByTitle = <T extends { title?: string }>(
  items: readonly T[] | null | undefined
): T[] =>
  [...(items ?? [])].sort((a, b) =>
    (a.title ?? '').toLowerCase().localeCompare((b.title ?? '').toLowerCase())
  );
export const sortByName = <T extends { name?: string }>(
  items: readonly T[] | null | undefined
): T[] =>
  [...(items ?? [])].sort((a, b) =>
    (a.name ?? '').toLowerCase().localeCompare((b.name ?? '').toLowerCase())
  );

/** Copia ordenada por fecha de inicio descendente (más recientes primero). */
export const sortByDate = <T extends { start?: string | Date }>(
  items: readonly T[] | null | undefined
): T[] => {
  const toMs = (v: string | Date | undefined) => new Date(v ?? 0).getTime();
  return [...(items ?? [])].sort((a, b) => toMs(b.start) - toMs(a.start));
};
export const sortInvoicesByDate = (
  items: readonly InvoiceModelFullData[] | null | undefined
): InvoiceModelFullData[] => {
  const toMs = (v: string | Date | undefined) => new Date(v ?? 0).getTime();
  return [...(items ?? [])].sort(
    (a, b) => toMs(b.date_invoice ?? 0) - toMs(a.date_invoice ?? 0)
  );
};

/** Copia ordenada por id descendente. */
export const sortById = <T extends { id?: number }>(
  items: readonly T[] | null | undefined
): T[] => [...(items ?? [])].sort((a, b) => (b.id ?? 0) - (a.id ?? 0));

/** Copia ordenada por año */
export const sortByYear = <T extends { year?: number | string | Date }>(
  items: readonly T[] | null | undefined
): T[] => {
  const toYear = (v: T['year']): number => {
    if (v == null) return -Infinity; // sin año → al final
    if (v instanceof Date) return v.getFullYear();
    const n = Number(v); // acepta "2024" o 2024
    return Number.isFinite(n) ? n : -Infinity; // inválidos → al final
  };

  return [...(items ?? [])].sort((a, b) => toYear(b.year) - toYear(a.year));
};

export const sortByCompany = <T extends { company: string }>(
  items: readonly T[] | null | undefined
): T[] =>
  [...(items ?? [])].sort((a, b) =>
    a.company.localeCompare(b.company, undefined, { sensitivity: 'base' })
  );

/** ¿Hay resultados? */
export const hasResults = <T>(
  items: readonly T[] | null | undefined
): boolean => Array.isArray(items) && items.length > 0;

/** Cuenta elementos con nullish-safe. */
export const count = <T>(items: readonly T[] | null | undefined): number =>
  items?.length ?? 0;

/**centralizar el filtrado por texto */
export const filterByKeyword = <T>(
  items: readonly T[] | null | undefined,
  keyword: string,
  keySelectors:
    | ((item: T) => string | undefined)
    | ((item: T) => string | undefined)[]
): T[] => {
  const list = items ?? [];
  const key = toSearchKey(keyword);
  if (!key) return [...list]; // sin filtro → todo

  const selectors = Array.isArray(keySelectors) ? keySelectors : [keySelectors];

  return list.filter((item) =>
    selectors.some((sel) => includesNormalized(sel(item) ?? '', key))
  );
};

export const downloadBlobFile = (blob: Blob, filename: string) => {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
};

export const buildInvoicePdfPaths = (
  data: InvoicePdf[] = [],
  includeProof = true
): string[] => {
  const set = new Set<string>();

  for (const inv of data) {
    const pushPath = (fileName?: string) => {
      if (!fileName) return;

      // Intenta extraer el año del nombre del archivo (formato 2024_...)
      const match = String(fileName).match(/^(\d{4})_/);
      const year = match?.[1] ?? (inv?.year != null ? String(inv.year) : '');

      set.add(year ? `${year}/${fileName}` : fileName);
    };

    // Factura principal
    pushPath(inv?.invoice_pdf);

    // Justificante (opcional)
    if (includeProof) pushPath(inv?.proof_pdf);
  }

  return Array.from(set);
};
