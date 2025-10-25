import { CdkTrapFocus } from '@angular/cdk/a11y';
import { NgClass } from '@angular/common';
import {
  Component,
  ElementRef,
  EventEmitter,
  HostListener,
  Input,
  NgZone,
  Output,
  ViewChild,
  inject,
} from '@angular/core';
import { TypeActionModal } from 'src/app/core/models/general.model';
import { BodyScrollLockService } from 'src/app/core/services/body-scroll-lock.service';

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

  private scrollLock = inject(BodyScrollLockService);
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

  /** Pide subir al top: si aún no hay ViewChild, lo haremos en cuanto exista */
  private requestScrollTop(behavior: ScrollBehavior) {
    this.pendingScroll = behavior;
    this.tryFlushPendingScroll();
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
