// shared/services/form-error-navigator.service.ts
import { Injectable } from '@angular/core';

@Injectable({ providedIn: 'root' })
export class FormErrorNavigatorService {
  scrollToFirstError(
    root: HTMLElement,
    opts?: { offset?: number; focus?: boolean }
  ) {
    const { offset = 0, focus = true } = opts || {};

    const candidate =
      root.querySelector('.is-invalid') ||
      root.querySelector('[formcontrolname].ng-invalid.ng-touched') ||
      root.querySelector('.is-invalid-text');

    if (candidate instanceof HTMLElement) {
      const rect = candidate.getBoundingClientRect();
      const absoluteY = window.scrollY + rect.top - offset;
      window.scrollTo({ top: absoluteY, behavior: 'smooth' });

      if (focus) {
        const focusable = candidate.matches('input,select,textarea')
          ? candidate
          : (candidate.querySelector(
              'input,select,textarea'
            ) as HTMLElement | null);
        focusable?.focus?.();
      }
    }
  }
}
