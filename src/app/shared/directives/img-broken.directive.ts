import { Directive, ElementRef, HostListener, Renderer2 } from '@angular/core';

@Directive({
  selector: 'img[appImgBroken]',
  standalone: true,
})
export class ImgBrokenDirective {
  constructor(
    private elHost: ElementRef<HTMLImageElement>,
    private renderer: Renderer2
  ) {}

  @HostListener('error')
  handleError(): void {
    const imgEl = this.elHost.nativeElement;
    const parent = imgEl.parentNode;

    if (parent) {
      const fallbackDiv = this.renderer.createElement('div');
      this.renderer.addClass(fallbackDiv, 'flex');
      this.renderer.addClass(fallbackDiv, 'flex-1');
      this.renderer.addClass(fallbackDiv, 'bg-gray-300');
      this.renderer.addClass(fallbackDiv, 'w-full');
      this.renderer.addClass(fallbackDiv, 'h-full');
      this.renderer.addClass(fallbackDiv, 'items-center');
      this.renderer.addClass(fallbackDiv, 'justify-center');

      const icon = this.renderer.createElement('i');
      this.renderer.addClass(icon, 'uil');
      this.renderer.addClass(icon, 'uil-camera');
      this.renderer.addClass(icon, 'text-white');
      this.renderer.addClass(icon, 'text-[80px]');
      this.renderer.addClass(icon, 'p-[10px]');

      this.renderer.appendChild(fallbackDiv, icon);

      this.renderer.insertBefore(parent, fallbackDiv, imgEl);
      this.renderer.removeChild(parent, imgEl);
    }
  }
}
