import {
  Directive,
  ElementRef,
  HostListener,
  Input,
  Renderer2,
} from '@angular/core';

@Directive({
  selector: '[appPinchZoom]',
  standalone: true,
})
export class PinchZoomDirective {
  @Input() maxScale = 5;
  @Input() minScale = 1;

  private el: HTMLImageElement;
  private container!: HTMLElement;

  private baseW = 0;
  private baseH = 0;

  private scale = 1;
  private tx = 0;
  private ty = 0;

  private pointers = new Map<number, PointerEvent>();
  private startScale = 1;
  private startTx = 0;
  private startTy = 0;
  private pinchStartDistance = 0;
  private pinchStartMid = { x: 0, y: 0 };
  private pinchFocusX = 0;
  private pinchFocusY = 0;
  private panStart = { x: 0, y: 0 };

  constructor(host: ElementRef<HTMLElement>, private r: Renderer2) {
    this.el = host.nativeElement as HTMLImageElement;
    this.container = this.el.parentElement as HTMLElement;

    // Estilos base
    this.r.setStyle(this.el, 'position', 'absolute');
    this.r.setStyle(this.el, 'top', '0');
    this.r.setStyle(this.el, 'left', '0');
    this.r.setStyle(this.el, 'touch-action', 'none');
    this.r.setStyle(this.el, 'user-select', 'none');
    this.r.setStyle(this.el, '-webkit-user-drag', 'none');
    this.r.setStyle(this.el, 'will-change', 'transform');
    this.r.setStyle(this.el, 'transform-origin', '0 0');

    if (this.el.complete && this.el.naturalWidth) {
      this.initSize();
    } else {
      this.el.addEventListener('load', () => this.initSize(), {
        once: true,
        passive: true,
      });
    }
  }

  private initSize() {
    this.computeBaseSize();
    this.centerImage();
    this.applyTransform();
  }

  private computeBaseSize() {
    const cw = this.container.clientWidth;
    const ch = this.container.clientHeight;
    const iw = this.el.naturalWidth || cw;
    const ih = this.el.naturalHeight || ch;

    const imageRatio = iw / ih;
    const containerRatio = cw / ch;

    if (imageRatio > containerRatio) {
      this.baseW = cw;
      this.baseH = cw / imageRatio;
    } else {
      this.baseH = ch;
      this.baseW = ch * imageRatio;
    }

    this.r.setStyle(this.el, 'width', `${this.baseW}px`);
    this.r.setStyle(this.el, 'height', `${this.baseH}px`);
  }

  private centerImage() {
    const cw = this.container.clientWidth;
    const ch = this.container.clientHeight;
    this.scale = 1;
    this.tx = (cw - this.baseW) / 2;
    this.ty = (ch - this.baseH) / 2;
  }

  private applyTransform() {
    this.r.setStyle(
      this.el,
      'transform',
      `translate(${this.tx}px, ${this.ty}px) scale(${this.scale})`
    );
  }

  private clampPanToBounds() {
    const cw = this.container.clientWidth;
    const ch = this.container.clientHeight;
    const sw = this.baseW * this.scale;
    const sh = this.baseH * this.scale;

    // X
    if (sw <= cw) {
      this.tx = (cw - sw) / 2;
    } else {
      const minTx = cw - sw;
      const maxTx = 0;
      this.tx = Math.min(maxTx, Math.max(minTx, this.tx));
    }
    // Y
    if (sh <= ch) {
      this.ty = (ch - sh) / 2;
    } else {
      const minTy = ch - sh;
      const maxTy = 0;
      this.ty = Math.min(maxTy, Math.max(minTy, this.ty));
    }
  }

  @HostListener('pointerdown', ['$event'])
  onPointerDown(ev: PointerEvent) {
    this.el.setPointerCapture(ev.pointerId);
    this.pointers.set(ev.pointerId, ev);

    if (this.pointers.size === 1) {
      this.panStart = { x: ev.clientX, y: ev.clientY };
      this.startTx = this.tx;
      this.startTy = this.ty;
    } else if (this.pointers.size === 2) {
      const [a, b] = Array.from(this.pointers.values());
      this.pinchStartDistance = this.distance(a, b);
      this.pinchStartMid = this.midpoint(a, b);

      // Estado inicial
      this.startScale = this.scale;
      this.startTx = this.tx;
      this.startTy = this.ty;

      // Foco del zoom relativo al contenedor
      const rect = this.container.getBoundingClientRect();
      this.pinchFocusX = this.pinchStartMid.x - rect.left;
      this.pinchFocusY = this.pinchStartMid.y - rect.top;

      // Evita gesto nativo en iOS
      ev.preventDefault();
    }
  }

  @HostListener('pointermove', ['$event'])
  onPointerMove(ev: PointerEvent) {
    if (!this.pointers.has(ev.pointerId)) return;
    this.pointers.set(ev.pointerId, ev);

    if (this.pointers.size === 2) {
      const [a, b] = Array.from(this.pointers.values());
      const currDist = this.distance(a, b);
      const currMid = this.midpoint(a, b);

      // Escala (clamp)
      let newScale =
        this.startScale * (currDist / Math.max(1, this.pinchStartDistance));
      newScale = Math.max(this.minScale, Math.min(this.maxScale, newScale));

      // Desplazamiento del punto medio
      const dx = currMid.x - this.pinchStartMid.x;
      const dy = currMid.y - this.pinchStartMid.y;

      // Zoom alrededor del foco (sin saltos)
      const k = newScale / this.startScale;
      this.tx = this.pinchFocusX - k * (this.pinchFocusX - this.startTx) + dx;
      this.ty = this.pinchFocusY - k * (this.pinchFocusY - this.startTy) + dy;
      this.scale = newScale;

      this.clampPanToBounds();
      this.applyTransform();

      // Evita scroll/zoom nativo durante el pinch
      ev.preventDefault();
    } else if (this.pointers.size === 1) {
      const p = ev;
      this.tx = this.startTx + (p.clientX - this.panStart.x);
      this.ty = this.startTy + (p.clientY - this.panStart.y);
      this.clampPanToBounds();
      this.applyTransform();
    }
  }

  @HostListener('pointerup', ['$event'])
  @HostListener('pointercancel', ['$event'])
  @HostListener('pointerleave', ['$event'])
  onPointerUp(ev: PointerEvent) {
    if (this.pointers.has(ev.pointerId)) this.pointers.delete(ev.pointerId);
  }

  // Doble tap/clic: 1x <-> 2x
  private lastTap = 0;
  @HostListener('click', ['$event'])
  onClick(ev: MouseEvent) {
    const now = Date.now();
    if (now - this.lastTap < 300) {
      const prev = this.scale;
      const cw = this.container.clientWidth;
      const ch = this.container.clientHeight;
      const cx = cw / 2;
      const cy = ch / 2;
      let ns = prev > 1 ? 1 : Math.min(2, this.maxScale);
      const k = ns / prev;
      this.tx = cx - k * (cx - this.tx);
      this.ty = cy - k * (cy - this.ty);
      this.scale = ns;
      this.clampPanToBounds();
      this.applyTransform();
      ev.preventDefault();
      ev.stopPropagation();
    }
    this.lastTap = now;
  }

  @HostListener('dblclick', ['$event'])
  onDblClick(ev: MouseEvent) {
    this.onClick(ev);
  }

  @HostListener('wheel', ['$event'])
  onWheel(ev: WheelEvent) {
    const factor = ev.deltaY < 0 ? 1.1 : 0.9;
    const rect = this.container.getBoundingClientRect();
    const fx = ev.clientX - rect.left;
    const fy = ev.clientY - rect.top;
    let ns = Math.max(
      this.minScale,
      Math.min(this.maxScale, this.scale * factor)
    );
    const k = ns / this.scale;
    this.tx = fx - k * (fx - this.tx);
    this.ty = fy - k * (fy - this.ty);
    this.scale = ns;
    this.clampPanToBounds();
    this.applyTransform();
    ev.preventDefault();
  }

  @HostListener('window:resize')
  onResize() {
    const prev = this.scale;
    this.computeBaseSize();
    this.centerImage();
    this.scale = prev;
    this.clampPanToBounds();
    this.applyTransform();
  }

  // utils
  private distance(a: PointerEvent, b: PointerEvent) {
    const dx = a.clientX - b.clientX;
    const dy = a.clientY - b.clientY;
    return Math.hypot(dx, dy);
  }
  private midpoint(a: PointerEvent, b: PointerEvent) {
    return { x: (a.clientX + b.clientX) / 2, y: (a.clientY + b.clientY) / 2 };
  }
}
