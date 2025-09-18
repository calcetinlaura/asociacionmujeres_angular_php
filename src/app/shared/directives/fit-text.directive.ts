// + OnChanges si quieres que reaccione a cambios en tiempo real
import {
  AfterViewInit,
  Directive,
  ElementRef,
  Input,
  OnChanges,
  OnDestroy,
  SimpleChanges,
} from '@angular/core';

@Directive({
  selector: '[appFitText]',
  standalone: true,
})
export class FitTextDirective implements AfterViewInit, OnDestroy, OnChanges {
  @Input() minPx = 10;
  @Input() maxPx = 16;
  @Input() stepPx = 1;
  @Input() lines = 1;

  // ⬇️ Nuevo: line-height en píxeles (opcional)
  @Input() lineHeightPx?: number;

  private ro?: ResizeObserver;
  private mo?: MutationObserver;

  constructor(private elRef: ElementRef<HTMLElement>) {}

  ngAfterViewInit() {
    const el = this.elRef.nativeElement;
    el.style.overflow = 'hidden';
    el.style.textOverflow = 'ellipsis';
    el.style.wordBreak = 'normal';
    el.style.overflowWrap = 'anywhere';

    if (this.lines === 1) {
      el.style.whiteSpace = 'nowrap';
    } else {
      el.style.whiteSpace = 'normal';
      (el.style as any).display = '-webkit-box';
      (el.style as any).webkitBoxOrient = 'vertical';
      (el.style as any).webkitLineClamp = String(this.lines);
    }

    this.applyLineHeight(); // ⬅️ aplica si viene por @Input
    this.fit();

    this.ro = new ResizeObserver(() => this.fit());
    this.ro.observe(el);

    this.mo = new MutationObserver(() => this.fit());
    this.mo.observe(el, {
      childList: true,
      characterData: true,
      subtree: true,
    });
  }

  ngOnChanges(_: SimpleChanges) {
    // Si cambian los @Input, re-aplica y recalcula
    if (this.elRef?.nativeElement) {
      this.applyLineHeight();
      this.fit();
    }
  }

  private applyLineHeight() {
    if (this.lineHeightPx != null) {
      this.elRef.nativeElement.style.lineHeight = `${this.lineHeightPx}px`;
    }
  }

  private fit() {
    const el = this.elRef.nativeElement;
    let size = this.maxPx;
    el.style.fontSize = `${size}px`;

    // Usa el line-height pasado o el calculado por CSS
    const cs = getComputedStyle(el);
    const lh =
      this.lineHeightPx != null
        ? this.lineHeightPx
        : parseFloat(cs.lineHeight || '16') ||
          parseFloat(cs.fontSize || '16') * 1.2;

    const maxH = this.lines === 1 ? lh : Math.ceil(lh * this.lines);

    let guard = 0;
    while (guard++ < 60) {
      const overflows =
        this.lines === 1
          ? el.scrollWidth > el.clientWidth
          : el.scrollHeight > maxH + 1;

      if (!overflows || size <= this.minPx) break;
      size -= this.stepPx;
      el.style.fontSize = `${size}px`;
    }
  }

  ngOnDestroy() {
    this.ro?.disconnect();
    this.mo?.disconnect();
  }
}
