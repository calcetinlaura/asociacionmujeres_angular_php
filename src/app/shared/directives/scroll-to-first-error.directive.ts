import {
  ChangeDetectorRef,
  Directive,
  ElementRef,
  HostListener,
  Input,
  Optional,
} from '@angular/core';
import { FormGroupDirective, NgForm } from '@angular/forms';
import { FormErrorNavigatorService } from 'src/app/core/services/form-error-navigator.service';

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
    private cdr: ChangeDetectorRef,
    private nav: FormErrorNavigatorService
  ) {}

  @HostListener('submit')
  @HostListener('ngSubmit')
  onSubmit() {
    const form = this.formGroupDir?.form || this.ngForm?.form;
    if (!form) return;

    if (form.invalid) {
      form.markAllAsTouched();
      this.cdr.detectChanges();

      // ⏳ Espera un tick más para que Angular renderice los errores
      setTimeout(() => {
        this.nav.scrollToFirstError(this.host.nativeElement, {
          offset: this.offset,
          focus: this.focus,
        });
      }, 0);
    }
  }
}
