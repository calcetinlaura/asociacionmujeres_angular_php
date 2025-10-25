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
      root.querySelector('.is-invalid-text') ||
      root.querySelector('[aria-invalid="true"]') ||
      root.querySelector('[data-error]');

    if (candidate instanceof HTMLElement) {
      const isVisible = !!(
        candidate.offsetWidth ||
        candidate.offsetHeight ||
        candidate.getClientRects().length
      );
      if (!isVisible) return;

      // ✅ versión más estable del scroll
      candidate.scrollIntoView({ behavior: 'smooth', block: 'center' });

      if (focus) {
        const focusable = candidate.matches('input,select,textarea')
          ? candidate
          : (candidate.querySelector(
              'input,select,textarea'
            ) as HTMLElement | null);
        focusable?.focus?.({ preventScroll: true });
      }
    }
  }
}
