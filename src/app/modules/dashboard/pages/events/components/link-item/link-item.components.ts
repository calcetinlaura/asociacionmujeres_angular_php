import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Input, Output } from '@angular/core';
import {
  AbstractControl,
  FormControl,
  FormGroup,
  ReactiveFormsModule,
} from '@angular/forms';

@Component({
  selector: 'app-link-item',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './link-item.component.html',
  styleUrls: ['../../../../components/form/form.component.css'],
})
export class LinkItemComponent {
  // MODO GROUP (webs / vídeos)
  @Input() group: FormGroup | null = null;
  @Input() textControlName: 'title' | 'label' = 'title';

  // MODO STANDALONE (online)
  @Input() standalone = false; // true => no formGroup
  @Input() urlCtrl: FormControl<string | null> | null = null;
  @Input() textCtrl: FormControl<string | null> | null = null;

  // UI
  @Input() submitted = false;
  @Input() urlPlaceholder = 'https://...';
  @Input() textLabel = 'Título';
  @Input() textPlaceholder = 'Título de la página web';
  @Input() showRemove = true;
  @Input() removeText = 'Eliminar';

  @Output() remove = new EventEmitter<void>();

  // helpers
  private urlControl(): AbstractControl | null {
    return this.standalone ? this.urlCtrl : this.group?.get('url') ?? null;
  }
  urlInvalid(): boolean {
    const c = this.urlControl();
    if (!c || !this.submitted) return false;
    const val = String(c.value ?? '').trim();
    if (!val) return false; // el requerido lo manejas fuera
    if ((c as any).errors?.['url']) return true;
    return !/^https?:\/\/.+/i.test(val);
  }
}
