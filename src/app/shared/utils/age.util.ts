export function parseDOB(input: unknown): Date | null {
  if (!input && input !== 0) return null;
  if (input instanceof Date) return isNaN(input.getTime()) ? null : input;
  if (typeof input === 'number') {
    const ms = input > 1e12 ? input : input * 1000;
    const d = new Date(ms);
    return isNaN(d.getTime()) ? null : d;
  }
  if (typeof input === 'string') {
    const s = input.trim();
    if (!s || s === '0000-00-00') return null;
    let m = s.match(/^(\d{4})-(\d{2})-(\d{2})$/);
    if (m) return new Date(+m[1], +m[2] - 1, +m[3]); // evita shift UTC
    m = s.match(/^(\d{2})[\/-](\d{2})[\/-](\d{4})$/);
    if (m) return new Date(+m[3], +m[2] - 1, +m[1]); // DD/MM/YYYY
    const d = new Date(s);
    return isNaN(d.getTime()) ? null : d;
  }
  return null;
}

export function calcAge(
  dobRaw: unknown,
  ref: Date = new Date()
): number | null {
  const dob = parseDOB(dobRaw);
  if (!dob) return null;
  let age = ref.getFullYear() - dob.getFullYear();
  const m = ref.getMonth() - dob.getMonth();
  if (m < 0 || (m === 0 && ref.getDate() < dob.getDate())) age--;
  return age >= 0 && age < 130 ? age : null;
}
