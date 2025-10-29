import { CdkTrapFocus } from '@angular/cdk/a11y';
import { NgClass } from '@angular/common';
import {
  AfterViewInit,
  Component,
  DOCUMENT,
  ElementRef,
  EventEmitter,
  Input,
  NgZone,
  OnChanges,
  OnDestroy,
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
  templateUrl: './modal-ui.component.html',
  styleUrls: ['./modal-ui.component.css'],
})
export class UiModalComponent implements AfterViewInit, OnChanges, OnDestroy {
  // ==============================
  // 📥 Inputs / Outputs
  // ==============================
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

  // ==============================
  // 🧱 Refs / Dependencias
  // ==============================
  @ViewChild('scrollArea') set scrollerRef(
    el: ElementRef<HTMLElement> | undefined
  ) {
    this.scrollArea = el;
    this.tryFlushPendingScroll();
  }
  private scrollArea?: ElementRef<HTMLElement>;

  @ViewChild('focusAnchor') private focusAnchor?: ElementRef<HTMLElement>;

  private readonly doc = inject(DOCUMENT);
  private readonly ngZone = inject(NgZone);

  // ==============================
  // ⚙️ Estado interno
  // ==============================
  private pendingScroll: ScrollBehavior | null = null;
  private removeWheel?: () => void;
  private removeTouch?: () => void;
  private removeEsc?: () => void;

  // NUEVO: gestión de scroll del body
  private pageScrollY = 0;

  // ==============================
  // 🎨 Clases dinámicas
  // ==============================
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

  // ==============================
  // 🔄 Ciclo de vida
  // ==============================
  ngOnChanges(changes: SimpleChanges) {
    if (changes['open']) {
      const isOpen = changes['open'].currentValue as boolean;
      if (isOpen) {
        this.lockBodyScroll();
      } else {
        this.unlockBodyScroll();
      }
    }
  }

  ngAfterViewInit() {
    // ✅ Registramos listeners manuales con passive: false
    this.ngZone.runOutsideAngular(() => {
      const doc = this.doc;

      const onWheel = (e: WheelEvent) => this.handleWheel(e);
      const onTouch = (e: TouchEvent) => this.handleTouch(e);
      const onEsc = (e: KeyboardEvent) => this.handleEscape(e);

      doc.addEventListener('wheel', onWheel, { passive: false });
      doc.addEventListener('touchmove', onTouch, { passive: false });
      doc.addEventListener('keydown', onEsc, { passive: false });

      // Limpieza
      this.removeWheel = () => doc.removeEventListener('wheel', onWheel);
      this.removeTouch = () => doc.removeEventListener('touchmove', onTouch);
      this.removeEsc = () => doc.removeEventListener('keydown', onEsc);
    });
  }

  ngOnDestroy() {
    this.unlockBodyScroll();
    this.removeWheel?.();
    this.removeTouch?.();
    this.removeEsc?.();
  }

  // ==============================
  // 🔧 Scroll control
  // ==============================
  /** Si hay una petición pendiente y ya existe el contenedor, hacemos scroll estable */
  private tryFlushPendingScroll() {
    if (!this.open || !this.pendingScroll || !this.scrollArea) return;

    const behavior = this.pendingScroll;
    this.pendingScroll = null;
    const el = this.scrollArea.nativeElement;

    this.focusAnchor?.nativeElement?.focus({ preventScroll: true } as any);

    const sub = this.ngZone.onStable.subscribe(() => {
      sub.unsubscribe();
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          el.scrollTop = 0;
          el.scrollTo({ top: 0, left: 0, behavior });
          requestAnimationFrame(() => {
            el.scrollTop = 0;
          });
        });
      });
    });
  }

  // ==============================
  // 🧭 Control de eventos
  // ==============================
  private eventInsideScrollArea(ev: Event): boolean {
    const area = this.scrollArea?.nativeElement;
    if (!area) return false;

    const path = (ev as any).composedPath?.() as EventTarget[] | undefined;

    if (Array.isArray(path) && path.length > 0) {
      return path.some(
        (t: EventTarget) =>
          t === area || (t instanceof Node && area.contains(t as Node))
      );
    }

    const target = ev.target as EventTarget | null;
    return !!(target && target instanceof Node && area.contains(target));
  }

  private handleWheel(e: WheelEvent) {
    if (!this.open) return;
    const area = this.scrollArea?.nativeElement;
    const inside = this.eventInsideScrollArea(e);

    if (!inside || !area) {
      e.preventDefault();
      return;
    }

    const atTop = area.scrollTop <= 0 && e.deltaY < 0;
    const atBottom =
      Math.ceil(area.scrollTop + area.clientHeight) >= area.scrollHeight &&
      e.deltaY > 0;

    if (atTop || atBottom) e.preventDefault();
  }

  private handleTouch(e: TouchEvent) {
    if (!this.open) return;
    const area = this.scrollArea?.nativeElement;
    const inside = this.eventInsideScrollArea(e);

    if (!inside || !area) {
      e.preventDefault();
      return;
    }

    const atTop = area.scrollTop <= 0;
    const atBottom =
      Math.ceil(area.scrollTop + area.clientHeight) >= area.scrollHeight;
    if (atTop || atBottom) e.preventDefault();
  }

  private handleEscape(e: KeyboardEvent) {
    if (e.key === 'Escape' && this.open && this.closeOnEscape) {
      e.preventDefault();
      this.close();
    }
  }

  // ==============================
  // 🧩 Acciones públicas
  // ==============================
  close() {
    this.open = false;
    this.openChange.emit(false);
    this.closed.emit();
    // Garantiza liberar scroll si no pasa por ngOnChanges
    this.unlockBodyScroll();
  }

  onBack() {
    this.back.emit();
  }

  // ==============================
  // 🔒 Scroll del body (fix salto al abrir)
  // ==============================
  private lockBodyScroll() {
    if (!this.lockScroll) return;

    const body = this.doc.body as HTMLElement;
    const html = this.doc.documentElement as HTMLElement;

    // Guarda la posición Y actual
    this.pageScrollY =
      window.scrollY ||
      this.doc.documentElement.scrollTop ||
      body.scrollTop ||
      0;

    // Compensa desaparición de scrollbar vertical para evitar “salto” horizontal
    const scrollBarComp = window.innerWidth - html.clientWidth;
    if (scrollBarComp > 0) {
      body.style.paddingRight = `${scrollBarComp}px`;
    }

    // Fija el body en su sitio sin permitir scroll
    body.style.position = 'fixed';
    body.style.top = `-${this.pageScrollY}px`;
    body.style.left = '0';
    body.style.right = '0';
    body.style.width = '100%';

    html.classList.add('modal-open');
    body.classList.add('modal-open');
  }

  private unlockBodyScroll() {
    const body = this.doc.body as HTMLElement;
    const html = this.doc.documentElement as HTMLElement;

    // Limpia estilos aplicados
    body.style.position = '';
    body.style.top = '';
    body.style.left = '';
    body.style.right = '';
    body.style.width = '';
    body.style.paddingRight = '';

    html.classList.remove('modal-open');
    body.classList.remove('modal-open');

    // Restaura la posición exacta previa a abrir la modal
    if (this.pageScrollY > 0) {
      window.scrollTo(0, this.pageScrollY);
    }
  }
}
