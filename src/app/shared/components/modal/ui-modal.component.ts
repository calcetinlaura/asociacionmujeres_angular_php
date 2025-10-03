import { CdkTrapFocus } from '@angular/cdk/a11y';
import { NgClass } from '@angular/common';
import {
  Component,
  EventEmitter,
  HostListener,
  Input,
  OnChanges,
  Output,
  SimpleChanges,
  inject,
} from '@angular/core';
import { TypeActionModal } from 'src/app/core/models/general.model';
import { BodyScrollLockService } from 'src/app/shared/services/body-scroll-lock.service';

@Component({
  selector: 'app-ui-modal',
  standalone: true,
  imports: [NgClass, CdkTrapFocus],
  templateUrl: './ui-modal.component.html',
  styleUrls: ['./ui-modal.component.css'],
})
export class UiModalComponent implements OnChanges {
  @Input() open = false;
  @Output() openChange = new EventEmitter<boolean>();
  @Output() opened = new EventEmitter<void>();
  @Output() closed = new EventEmitter<void>();

  @Input() canGoBack = false;
  @Output() back = new EventEmitter<void>();

  @Input() size: null | 'sm' | 'md' | 'lg' | 'xl' | 'full' = 'xl';
  @Input() closeOnBackdrop = true;
  @Input() closeOnEscape = true;
  @Input() lockScroll = true;
  @Input() hasTitle = true;
  @Input() hasActions = false;
  @Input() variant: TypeActionModal | null = null;
  @Input() showClose = true;
  @Input() panelClass: string | string[] | Record<string, boolean> = '';
  private scrollLock = inject(BodyScrollLockService);

  get sizeClass() {
    // Si es panel PDF, no apliques tamaños “normales”
    if (this.isPdfPanel) return 'w-[96vw] max-w-[96vw] h-[92vh]';

    switch (this.size) {
      case 'sm':
        return 'max-w-sm';
      case 'md':
        return 'max-w-md';
      case 'lg':
        return 'max-w-2xl';
      case 'xl':
        return 'max-w-4xl';
      case 'full':
        return 'w-[96vw] max-w-[96vw] h-[96vh]';
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
    return this.variant ? `modal-${this.variant}` : '';
  }

  ngOnChanges(ch: SimpleChanges) {
    if ('open' in ch) {
      if (this.open) {
        if (this.lockScroll) this.scrollLock.lock();
        queueMicrotask(() => this.opened.emit());
      } else {
        if (this.lockScroll) this.scrollLock.unlock();
        this.closed.emit();
      }
    }
  }
  ngOnDestroy() {
    // Por si el componente se destruye sin pasar por open=false
    if (this.lockScroll) this.scrollLock.unlock();
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
