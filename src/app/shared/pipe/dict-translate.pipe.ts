import { ChangeDetectorRef, Pipe, PipeTransform, inject } from '@angular/core';
import { TranslationsService } from 'src/i18n/translations.service';

export enum DictType {
  General = 'general',
  Categories = 'categories',
  AccessType = 'accessType',
}

@Pipe({
  name: 'dicTranslate',
  standalone: true,
  // la traducción se carga asíncronamente → necesitamos que se reevalúe
  pure: false,
})
export class DictTranslatePipe implements PipeTransform {
  private i18n = inject(TranslationsService);
  private cdr = inject(ChangeDetectorRef);

  // Si usas signals dentro del servicio, fuerza CD cuando cambien
  // (truco simple: un setTimeout tras load; o expón un observable y suscríbete).
  // Si tu TranslationsService ya carga en APP INIT, esto ni lo notarás.

  transform(
    value: string | null | undefined,
    type: DictType,
    opts?: { fallback?: string; normalize?: 'upper' | 'lower' | false }
  ): string {
    const dict = (this.i18n.dict() as any) ?? {};
    const map: Record<string, string> = dict?.[type] ?? {};

    const norm = (s: string) => {
      if (opts?.normalize === 'lower') return s.toLowerCase();
      if (opts?.normalize === 'upper' || opts?.normalize == null)
        return s.toUpperCase();
      return s;
    };

    const key = norm(String(value ?? ''));
    const res = map[key] ?? map['other'] ?? opts?.fallback ?? value ?? '';

    // marca para comprobar por si la dict ha llegado después
    this.cdr.markForCheck();
    return res;
  }
}
