import { ChangeDetectorRef, Pipe, PipeTransform, inject } from '@angular/core';
import { TranslationsService } from 'src/i18n/translations.service';

export enum DictType {
  General = 'general',
  Categories = 'categories',
  AccessType = 'accessType',
  Audience = 'audience',
  AudienceAges = 'audienceAges',
  AudienceRestrictions = 'audienceRestrictions',
  Partners = 'partners',
  PartnersAgeBuckets = 'partners.ageBuckets',
  PaymentMethod = 'paymentMethod',
  Parking = 'parking',
}

@Pipe({
  name: 'dictTranslate',
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

    // 👇 resolver ruta anidada: 'partners.ageBuckets' → dict.partners.ageBuckets
    const map =
      String(type)
        .split('.')
        .reduce((acc: any, k) => acc?.[k], dict) ?? {};

    const norm = (s: string) => {
      if (opts?.normalize === false) return s; // 👈 respeta claves tal cual
      if (opts?.normalize === 'lower') return s.toLowerCase();
      // por compatibilidad, mantenemos 'upper' como defecto
      return s.toUpperCase();
    };

    const key = norm(String(value ?? ''));
    const res = map[key] ?? map['other'] ?? opts?.fallback ?? value ?? '';

    this.cdr.markForCheck();
    return res;
  }
}
