import { DOCUMENT } from '@angular/common';
import { Injectable, Renderer2, RendererFactory2, inject } from '@angular/core';

@Injectable({ providedIn: 'root' })
export class BodyScrollLockService {
  private r: Renderer2;
  private doc = inject(DOCUMENT);
  private locks = new Map<HTMLElement, { y: number }>();

  constructor(rf: RendererFactory2) {
    this.r = rf.createRenderer(null, null);
  }

  lock(target?: HTMLElement) {
    const el =
      target ?? (this.doc.scrollingElement as HTMLElement) ?? this.doc.body;
    if (this.locks.has(el)) return; // ya bloqueado

    // guardar scroll actual y compensar barra
    const y = el.scrollTop || 0;
    const sbw = el.offsetWidth - el.clientWidth;

    this.r.setStyle(el, 'position', 'fixed');
    this.r.setStyle(el, 'overflow', 'hidden');
    this.r.setStyle(el, 'width', '100%');
    this.r.setStyle(el, 'top', `-${y}px`);
    if (sbw > 0) this.r.setStyle(el, 'paddingRight', `${sbw}px`);

    this.locks.set(el, { y });
  }

  unlock(target?: HTMLElement) {
    const el =
      target ?? (this.doc.scrollingElement as HTMLElement) ?? this.doc.body;
    const state = this.locks.get(el);
    if (!state) return;

    const { y } = state;
    this.r.removeStyle(el, 'position');
    this.r.removeStyle(el, 'overflow');
    this.r.removeStyle(el, 'width');
    this.r.removeStyle(el, 'top');
    this.r.removeStyle(el, 'paddingRight');
    el.scrollTop = y;

    this.locks.delete(el);
  }
}
