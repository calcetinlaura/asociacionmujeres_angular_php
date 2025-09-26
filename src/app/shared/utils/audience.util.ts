// audience.util.ts
import { AudienceDTO } from 'src/app/core/interfaces/event.interface';

export type AudienceDict = {
  audience: {
    allPublic: string;
    ages: {
      label: string;
      babies: string;
      kids: string;
      teens: string;
      adults: string;
      seniors: string;
    };
    note: string;
    restrictions: {
      membersOnly: string;
      womenOnly: string;
      other: string;
    };
    combo: {
      over12: string;
      adultsSeniors: string;
      over3: string;

      kidsTeens: string;
      teensAdults: string;
      kidsTeensAdults: string;
      kidsAdultsSeniors: string;
      teensSeniors: string;
      babiesKids: string;
      babiesKidsTeens: string;

      allAges: string;
    };
  };
};

type AgeKey = 'babies' | 'kids' | 'teens' | 'adults' | 'seniors';
const AGE_ORDER: AgeKey[] = ['babies', 'kids', 'teens', 'adults', 'seniors'];

/** Reglas de combinación → clave de traducción en i18n (prioridad por orden) */
const COMBO_RULES: Array<{
  keys: AgeKey[];
  tKey: keyof AudienceDict['audience']['combo'];
}> = [
  // Umbrales
  { keys: ['teens', 'adults', 'seniors'], tKey: 'over12' },
  { keys: ['adults', 'seniors'], tKey: 'adultsSeniors' },
  { keys: ['kids', 'teens', 'adults', 'seniors'], tKey: 'over3' },

  // Frecuentes
  { keys: ['kids', 'teens'], tKey: 'kidsTeens' },
  { keys: ['teens', 'adults'], tKey: 'teensAdults' },
  { keys: ['kids', 'teens', 'adults'], tKey: 'kidsTeensAdults' },
  { keys: ['kids', 'adults', 'seniors'], tKey: 'kidsAdultsSeniors' },
  { keys: ['teens', 'seniors'], tKey: 'teensSeniors' },
  { keys: ['babies', 'kids'], tKey: 'babiesKids' },
  { keys: ['babies', 'kids', 'teens'], tKey: 'babiesKidsTeens' },

  // Todas activas (por si el DTO no marca allPublic)
  { keys: ['babies', 'kids', 'teens', 'adults', 'seniors'], tKey: 'allAges' },
];

export function parseAudience(raw: unknown): AudienceDTO | null {
  if (!raw) return null;
  if (typeof raw === 'string') {
    try {
      return JSON.parse(raw) as AudienceDTO;
    } catch {
      return null;
    }
  }
  return raw as AudienceDTO;
}

export function audienceAgeLabel(
  ages: Partial<Record<AgeKey, boolean>>,
  dict: AudienceDict
): string | null {
  const active = AGE_ORDER.filter((k) => !!ages[k]) as AgeKey[];
  if (active.length === 0) return null;

  // 1) Coincidencia exacta por prioridad
  for (const rule of COMBO_RULES) {
    const wanted = rule.keys;
    if (
      wanted.length === active.length &&
      wanted.every((k) => active.includes(k))
    ) {
      return dict.audience.combo[rule.tKey] ?? null;
    }
  }

  // 2) Fallbacks genéricos usando i18n
  if (active.length === 1) {
    const k = active[0];
    return k === 'babies'
      ? dict.audience.ages.babies
      : k === 'kids'
      ? dict.audience.ages.kids
      : k === 'teens'
      ? dict.audience.ages.teens
      : k === 'adults'
      ? dict.audience.ages.adults
      : dict.audience.ages.seniors;
  }

  const names = active.map((k) =>
    k === 'babies'
      ? dict.audience.ages.babies
      : k === 'kids'
      ? dict.audience.ages.kids
      : k === 'teens'
      ? dict.audience.ages.teens
      : k === 'adults'
      ? dict.audience.ages.adults
      : dict.audience.ages.seniors
  );
  return dict.audience.ages.label.replace('{{list}}', names.join(', '));
}

export function audienceBadges(raw: unknown, dict: AudienceDict): string[] {
  const a = parseAudience(raw);
  if (!a || !dict?.audience) return [];

  const A = dict.audience;
  const out: string[] = [];

  // 0) Si el DTO marca allPublic, prioriza esa etiqueta
  if (a.allPublic) {
    out.push(A.allPublic);
    return out;
  }

  // 1) Edades (usa combos i18n si aplican)
  if (a.hasAgeRecommendation) {
    const label = audienceAgeLabel(a.ages ?? {}, dict);
    if (label) out.push(label);
    if (a.ageNote) out.push(A.note.replace('{{text}}', a.ageNote));
  }

  // 2) Restricciones
  if (a.hasRestriction) {
    if (a.restrictions?.membersOnly) out.push(A.restrictions.membersOnly);
    if (a.restrictions?.womenOnly) out.push(A.restrictions.womenOnly);
    if (a.restrictions?.other && a.restrictions?.otherText) {
      out.push(
        A.restrictions.other.replace('{{text}}', a.restrictions.otherText)
      );
    }
  }

  return out;
}
