import {
  ChangeDetectorRef,
  Directive,
  ElementRef,
  HostListener,
  Input,
  Optional,
} from '@angular/core';
import { FormGroupDirective, NgForm } from '@angular/forms';

@Directive({
  selector: 'form[appScrollToFirstError]',
  standalone: true,
})
export class ScrollToFirstErrorDirective {
  @Input() offset = 0;
  @Input() focus = true;

  constructor(
    private host: ElementRef<HTMLElement>,
    @Optional() private formGroupDir: FormGroupDirective | null,
    @Optional() private ngForm: NgForm | null,
    private cdr: ChangeDetectorRef
  ) {}

  @HostListener('submit')
  @HostListener('ngSubmit')
  onSubmit() {
    const form = this.formGroupDir?.form || this.ngForm?.form;
    if (!form) return;

    if (form.invalid) {
      form.markAllAsTouched();
      this.cdr.detectChanges();

      requestAnimationFrame(() => {
        const root = this.host.nativeElement;
        const candidate =
          root.querySelector('.is-invalid') ||
          root.querySelector('[formcontrolname].ng-invalid.ng-touched') ||
          root.querySelector('.is-invalid-text');

        if (candidate instanceof HTMLElement) {
          const rect = candidate.getBoundingClientRect();
          const top = window.scrollY + rect.top - this.offset;
          window.scrollTo({ top, behavior: 'smooth' });

          if (this.focus) {
            const focusable = candidate.matches('input,select,textarea')
              ? candidate
              : (candidate.querySelector(
                  'input,select,textarea'
                ) as HTMLElement | null);
            focusable?.focus?.();
          }
        }
      });
    }
  }
}
