import { Directive, ElementRef, HostListener, Input } from '@angular/core';

@Directive({
  selector: 'img[appImgBroken]',
  standalone: true,
})
export class ImgBrokenDirective {
  // @Input() customImg: string = '';
  @HostListener('error') handleError(): void {
    const elNative = this.elHost.nativeElement;

    // Obtener la ruta base del componente
    const componentPath = this.getComponentPath();

    // Construir la ruta de la imagen de error relativa al componente
    const errorImagePath = 'assets/img/error.jpg';

    // Establecer la nueva ruta de la imagen
    elNative.src = errorImagePath;
  }

  constructor(private elHost: ElementRef) {}

  // Función para obtener la ruta base del componente
  private getComponentPath(): string {
    // Obtener el script actual
    const currentScript = document.currentScript;

    // if (currentScript) {
    //   // Extraer la ruta base del componente
    //   const componentBasePath = currentScript.src
    //     ? currentScript.src.replace('/nombre-del-componente.js', '')
    //     : '';
    //   return componentBasePath;
    // }

    return '';
  }
}
