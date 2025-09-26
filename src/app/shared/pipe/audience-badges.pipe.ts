import { ChangeDetectorRef, inject, Pipe, PipeTransform } from '@angular/core';
import { TranslationsService } from 'src/i18n/translations.service';
import { audienceBadges, AudienceDict } from '../utils/audience.util';

@Pipe({
  name: 'audienceBadges',
  standalone: true,
  pure: false,
})
export class AudienceBadgesPipe implements PipeTransform {
  private i18n = inject(TranslationsService);
  private cdr = inject(ChangeDetectorRef);

  transform(raw: unknown): string[] {
    // Si tu servicio no está tipado, puedes castear a AudienceDict
    const dict = this.i18n.dict() as unknown as AudienceDict;

    // ✅ Comprobaciones acordes al nuevo shape:
    if (
      !dict ||
      !dict.audience ||
      !dict.audience.ages ||
      !dict.audience.restrictions
    ) {
      this.cdr.markForCheck();
      return [];
    }

    return audienceBadges(raw, dict);
  }
}
