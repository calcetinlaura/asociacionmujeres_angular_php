import {
  Component,
  ElementRef,
  EventEmitter,
  HostListener,
  Input,
  Output,
  ViewChild,
} from '@angular/core';

@Component({
  selector: 'app-confirm-dialog',
  standalone: true,
  templateUrl: './modal-confirm-dialog.html',
  styleUrls: ['./modal-confirm-dialog.css'],
})
export class ConfirmDialogComponent {
  @Input() title = '¿Confirmar acción?';
  @Input() message = 'Esta acción no se puede deshacer.';
  @Input() confirmText = 'Aceptar';
  @Input() cancelText = 'Cancelar';

  // Nuevo: controla backdrop y stacking
  @Input() closeOnBackdrop = true;
  @Input() zIndex = 1000;

  // A11y ids
  @Input() titleId = 'confirm-title';
  @Input() descId = 'confirm-desc';

  @Output() confirm = new EventEmitter<void>();
  @Output() cancel = new EventEmitter<void>();

  @ViewChild('panel') panelRef!: ElementRef<HTMLElement>;
  @ViewChild('cancelBtn') cancelBtnRef!: ElementRef<HTMLButtonElement>;

  ngAfterViewInit(): void {
    // Asegura foco dentro del diálogo
    this.panelRef?.nativeElement?.focus();
  }

  // Cerrar con ESC
  @HostListener('document:keydown.escape')
  onEscape() {
    this.cancel.emit();
  }
}
