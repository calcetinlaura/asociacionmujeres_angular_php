export function buildShareUrl(opts: {
  base: string; // environments.publicBaseUrl
  path: string; // '/events', '/books/123', etc.
  params?: Record<string, string | number | boolean | null | undefined>;
  fragment?: string; // 'event-123', 'book-45', etc.
}): string {
  const base = opts.base.replace(/\/+$/, '');
  const path = opts.path.startsWith('/') ? opts.path : '/' + opts.path;

  const usp = new URLSearchParams();
  if (opts.params) {
    Object.entries(opts.params).forEach(([k, v]) => {
      if (v !== null && v !== undefined && v !== false && v !== '') {
        usp.set(k, String(v));
      }
    });
  }
  const qs = usp.toString();
  const hash = opts.fragment ? `#${opts.fragment}` : '';
  return `${base}${path}${qs ? '?' + qs : ''}${hash}`;
}

// (Opcional) helper para fechas locales sin líos de timezone
export function localISODate(d: Date): string {
  const dd = new Date(d.getFullYear(), d.getMonth(), d.getDate());
  return dd.toLocaleDateString('sv-SE'); // YYYY-MM-DD
}
export function buildShareTitle(
  baseTitle: string,
  date: Date | null | undefined,
  locale = 'es-ES'
): string {
  if (!date) return baseTitle;
  const d = new Date(date.getFullYear(), date.getMonth(), date.getDate()); // normaliza a medianoche local
  const formatted = new Intl.DateTimeFormat(locale, {
    weekday: 'long',
    day: '2-digit',
    month: 'long',
    year: 'numeric',
  }).format(d);
  return `${baseTitle} - ${formatted}`;
}

/** Intenta obtener la fecha de contexto: prioriza `date`, si no existe usa el start del primer evento. */
export function pickShareDate(
  date: Date | null | undefined,
  events: Array<{ start?: string | Date }> = []
): Date | null {
  if (date instanceof Date) return date;
  const start = events?.[0]?.start;
  if (!start) return null;
  if (start instanceof Date) return start;
  // start suele venir "YYYY-MM-DD" -> evita UTC usando partes
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(start);
  if (m) {
    const [, y, mo, d] = m.map(Number);
    return new Date(y, mo - 1, d);
  }
  // fallback genérico
  const parsed = new Date(start);
  return isNaN(parsed.getTime()) ? null : parsed;
}
