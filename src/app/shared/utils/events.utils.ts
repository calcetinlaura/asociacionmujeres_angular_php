/** Devuelve true si el evento no está publicado */
export function isDraft(ev: any): boolean {
  return Number(ev?.published) !== 1;
}

/** Devuelve un objeto Date válido para publish_day + publish_time */
export function parsePublishDate(ev: any): Date | null {
  const day = (ev?.publish_day ?? '').toString().trim();
  const timeRaw = (ev?.publish_time ?? '').toString().trim();
  if (!day) return null;
  const time = timeRaw.length === 5 ? `${timeRaw}:00` : timeRaw || '00:00:00';
  const d = new Date(`${day}T${time}`);
  return isNaN(d.getTime()) ? null : d;
}

/** Devuelve true si el evento está programado para publicarse en el futuro */
export function isScheduled(ev: any, now = Date.now()): boolean {
  if (isDraft(ev)) return false;
  const dt = parsePublishDate(ev);
  return !!dt && dt.getTime() > now;
}

/** Devuelve true si el evento está publicado y visible actualmente */
export function isPublishedVisible(ev: any, now = Date.now()): boolean {
  if (Number(ev?.published) !== 1) return false; // no publicado
  const dt = parsePublishDate(ev);
  if (!dt) return true; // sin fecha -> visible directamente
  return dt.getTime() <= now;
}

/** YYYY-MM-DD (locale seguro tipo sv-SE) */
export function toIsoDate(d: Date): string {
  return d.toLocaleDateString('sv-SE');
}

/** Comprueba si una fecha ISO cae dentro del intervalo [start,end] del evento */
export function isOnDate(isoDate: string, ev: any): boolean {
  const s = ev?.start ? String(ev.start).slice(0, 10) : undefined;
  const e = ev?.end ? String(ev.end).slice(0, 10) : s ?? '';
  return !!s && s <= isoDate && isoDate <= e;
}

/** Pequeño helper por si necesitas saber si el evento tiene imagen */
export function hasImg(ev: any): boolean {
  const img = (ev?.img ?? '').toString().trim();
  return img.length > 0;
}
