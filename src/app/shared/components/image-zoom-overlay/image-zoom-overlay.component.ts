import { CommonModule } from '@angular/common';
import {
  Component,
  EventEmitter,
  HostListener,
  Input,
  OnChanges,
  OnDestroy,
  Output,
  SimpleChanges,
} from '@angular/core';
import { PinchZoomDirective } from '../../directives/pinch-zoom.directive';

@Component({
  selector: 'app-image-zoom-overlay',
  standalone: true,
  imports: [CommonModule, PinchZoomDirective],
  templateUrl: `./image-zoom-overlay.component.html`,
})
export class ImageZoomOverlayComponent implements OnChanges, OnDestroy {
  /** Control externo del overlay */
  @Input() open = false;

  /** Fuente de la imagen */
  @Input() src!: string;

  /** Texto alternativo */
  @Input() alt = '';

  /** Límite de zoom */
  @Input() maxScale = 5;

  /** Zoom mínimo */
  @Input() minScale = 1;

  /** Opcional: texto accesible / caption */
  @Input() ariaLabel?: string;
  @Input() caption?: string;

  /** Cerrar (evento hacia el padre) */
  @Output() closed = new EventEmitter<void>();

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['open']) {
      // Bloquea / restaura scroll del body
      if (this.open) {
        document.body.style.overflow = 'hidden';
      } else {
        document.body.style.overflow = '';
      }
    }
  }

  ngOnDestroy(): void {
    document.body.style.overflow = '';
  }

  requestClose() {
    this.closed.emit();
  }

  @HostListener('document:keydown.escape')
  onEsc() {
    if (this.open) this.requestClose();
  }
}
