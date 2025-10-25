import { CdkTrapFocus } from '@angular/cdk/a11y';
import { NgClass } from '@angular/common';
import {
  Component,
  DOCUMENT,
  ElementRef,
  EventEmitter,
  HostListener,
  Input,
  NgZone,
  Output,
  SimpleChanges,
  ViewChild,
  inject,
} from '@angular/core';
import { TypeActionModal } from 'src/app/core/models/general.model';

@Component({
  selector: 'app-ui-modal',
  standalone: true,
  imports: [NgClass, CdkTrapFocus],
  templateUrl: './ui-modal.component.html',
  styleUrls: ['./ui-modal.component.css'],
})
export class UiModalComponent {
  @Input() open = false;
  @Input() contentVersion = 0;

  @Output() openChange = new EventEmitter<boolean>();
  @Output() opened = new EventEmitter<void>();
  @Output() closed = new EventEmitter<void>();

  @Input() canGoBack = false;
  @Output() back = new EventEmitter<void>();

  @Input() size: null | 'sm' | 'md' | 'lg' | 'xl' | 'full' = null;
  @Input() closeOnBackdrop = true;
  @Input() closeOnEscape = true;
  @Input() lockScroll = true;
  @Input() hasTitle = true;
  @Input() hasActions = false;
  @Input() variant: TypeActionModal | null = null;
  @Input() showClose = true;
  @Input() panelClass: string | string[] | Record<string, boolean> = '';

  // ⬇️ NOTA: usamos un setter para enterarnos EXACTAMENTE cuando aparece el scroller
  @ViewChild('scrollArea') set scrollerRef(
    el: ElementRef<HTMLElement> | undefined
  ) {
    this.scrollArea = el;

    this.tryFlushPendingScroll();
  }
  private scrollArea?: ElementRef<HTMLElement>;
  @ViewChild('focusAnchor') private focusAnchor?: ElementRef<HTMLElement>;

  private doc = inject(DOCUMENT);
  private ngZone = inject(NgZone);

  // Petición pendiente de scroll si el ViewChild aún no existe
  private pendingScroll: ScrollBehavior | null = null;

  get sizeClass() {
    if (this.isPdfPanel) return 'w-[96vw] max-w-[96vw] h-[92vh]';
    switch (this.size) {
      case 'sm':
        return 'max-w-sm';
      case 'md':
        return 'max-w-md';
      case 'lg':
      case 'xl':
      case 'full':
        return '';
      default:
        return 'max-w-2xl';
    }
  }
  get isPdfPanel(): boolean {
    const pc = this.panelClass;
    if (typeof pc === 'string') return pc.split(/\s+/).includes('pdf-panel');
    if (Array.isArray(pc)) return pc.includes('pdf-panel');
    if (pc && typeof pc === 'object') return !!pc['pdf-panel'];
    return false;
  }
  get variantClass(): string {
    return this.variant && this.size == null ? `modal-${this.variant}` : '';
  }

  // ----- Scroll helpers -------------------------------------------------

  ngOnChanges(changes: SimpleChanges) {
    if (changes['open']) {
      const isOpen = changes['open'].currentValue;
      const html = this.doc.documentElement;
      const body = this.doc.body;
      if (isOpen) {
        html.classList.add('modal-open');
        body.classList.add('modal-open');
      }
      // Do NOT remove the class here on close; let ngOnDestroy do it.
    }
  }

  ngOnDestroy() {
    const html = this.doc.documentElement;
    const body = this.doc.body;
    html.classList.remove('modal-open');
    body.classList.remove('modal-open');
  }
  /** Si tenemos petición pendiente y ya existe el contenedor, hacemos scroll estable */
  private tryFlushPendingScroll() {
    if (!this.open || !this.pendingScroll || !this.scrollArea) {
      return;
    }

    const behavior = this.pendingScroll;
    this.pendingScroll = null;

    const el = this.scrollArea.nativeElement;
    console.log('[UI-MODAL] tryFlushPendingScroll START', {
      behavior,
      before: {
        scrollTop: el.scrollTop,
        h: el.scrollHeight,
        ch: el.clientHeight,
      },
    });

    this.focusAnchor?.nativeElement?.focus({ preventScroll: true } as any);

    const sub = this.ngZone.onStable.subscribe(() => {
      sub.unsubscribe();
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          // golpe doble
          el.scrollTop = 0;
          el.scrollTo({ top: 0, left: 0, behavior });
          requestAnimationFrame(() => {
            console.log('[UI-MODAL] after rAF 1', { scrollTop: el.scrollTop });
            el.scrollTop = 0;
            requestAnimationFrame(() => {
              console.log('[UI-MODAL] after rAF 2 (final)', {
                scrollTop: el.scrollTop,
                canScroll: el.scrollHeight > el.clientHeight,
              });
            });
          });
        });
      });
    });
  }
  // ----- Ciclo de vida --------------------------------------------------

  // ----- UX -------------------------------------------------------------

  /** Helper to know if event happened inside the scrollable section */
  private eventInsideScrollArea(ev: Event): boolean {
    const area = this.scrollArea?.nativeElement;
    if (!area) return false;
    const path = (ev as any).composedPath?.() as EventTarget[] | undefined;
    if (path && path.length)
      return (
        path.includes(area) ||
        path.some((n) => n instanceof Node && area.contains(n as Node))
      );
    // Fallback
    const t = ev.target as Node | null;
    return !!(t && area.contains(t));
  }

  /** Prevent the page from scrolling unless we're scrolling the section,
   * and even then, block at the edges to avoid chain scrolling. */
  @HostListener('wheel', ['$event'])
  onWheel(e: WheelEvent) {
    if (!this.open) return;

    const area = this.scrollArea?.nativeElement;
    const inside = this.eventInsideScrollArea(e);

    // If the event is NOT in the scrollable section, block it (header, overlay, etc.)
    if (!inside) {
      e.preventDefault();
      return;
    }

    if (!area) {
      e.preventDefault();
      return;
    }

    // Inside the section: allow normal scroll, but prevent chaining at edges
    const atTop = area.scrollTop <= 0 && e.deltaY < 0;
    const atBottom =
      Math.ceil(area.scrollTop + area.clientHeight) >= area.scrollHeight &&
      e.deltaY > 0;

    if (atTop || atBottom) {
      e.preventDefault();
    }
  }

  @HostListener('touchmove', ['$event'])
  onTouchMove(e: TouchEvent) {
    if (!this.open) return;

    const area = this.scrollArea?.nativeElement;
    const inside = this.eventInsideScrollArea(e);

    if (!inside) {
      e.preventDefault();
      return;
    }

    if (!area) {
      e.preventDefault();
      return;
    }

    // iOS “bounce” can still try to chain at edges — block it there too
    const atTop = area.scrollTop <= 0;
    const atBottom =
      Math.ceil(area.scrollTop + area.clientHeight) >= area.scrollHeight;
    if (atTop || atBottom) {
      e.preventDefault();
    }
  }
  @HostListener('document:keydown.escape', ['$event'])
  onEsc(ev: KeyboardEvent) {
    if (this.open && this.closeOnEscape) {
      ev.preventDefault();
      this.close();
    }
  }

  close() {
    this.open = false;
    this.openChange.emit(false);
  }
  onBack() {
    this.back.emit();
  }
}
