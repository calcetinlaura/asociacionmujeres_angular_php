import { CommonModule } from '@angular/common';
import { Component, computed, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { TranslationsService } from './translations.service';

@Component({
  selector: 'app-translations-page',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <section class="p-6 flex flex-col gap-4">
      <header class="flex items-center gap-3 flex-wrap">
        <h1 class="text-xl font-semibold">Traducciones</h1>
        <label class="flex items-center gap-2">
          Idioma:
          <select [(ngModel)]="langSel" (ngModelChange)="onChangeLang($event)">
            @for (l of svc.languages; track l) {
            <option [ngValue]="l">{{ l }}</option>
            }
          </select>
        </label>

        <input
          class="border px-2 py-1 rounded grow max-w-[360px]"
          type="search"
          placeholder="Buscar clave o texto…"
          [(ngModel)]="query"
        />

        <button class="btn" (click)="onAdd()">Añadir clave</button>
        <button class="btn" (click)="onExport()">Exportar JSON</button>
        <!-- (Opcional) Guardar en servidor -->
        <!-- <button class="btn primary" [disabled]="!svc.dirty()" (click)="onSave()">Guardar</button> -->

        <span class="ml-auto text-sm text-gray-500">
          {{ filteredCount() }} / {{ svc.count() }} entradas
          <span *ngIf="svc.dirty()" class="text-amber-600 ml-2"
            >● cambios sin guardar</span
          >
        </span>
      </header>

      <!-- Tabla -->
      <div class="overflow-auto border rounded">
        <table class="min-w-[720px] w-full">
          <thead>
            <tr class="bg-gray-50">
              <th class="text-left px-3 py-2 w-[40%]">Clave</th>
              <th class="text-left px-3 py-2">Valor ({{ langSel }})</th>
              <th class="px-3 py-2 w-[80px]">Acciones</th>
            </tr>
          </thead>
          <tbody>
            @for (row of rows(); track row.key) {
            <tr class="border-t">
              <td class="px-3 py-2 font-mono text-xs">{{ row.key }}</td>
              <td class="px-3 py-2">
                <input
                  class="w-full border px-2 py-1 rounded"
                  [ngModel]="row.value"
                  (ngModelChange)="svc.setValue(row.key, $event)"
                />
              </td>
              <td class="px-3 py-2 text-center">
                <button class="btn danger" (click)="svc.removeKey(row.key)">
                  Eliminar
                </button>
              </td>
            </tr>
            } @empty {
            <tr>
              <td colspan="3" class="px-3 py-6 text-center text-gray-500">
                Sin resultados
              </td>
            </tr>
            }
          </tbody>
        </table>
      </div>
    </section>
  `,
  styles: [
    `
      .btn {
        @apply border px-3 py-1 rounded text-sm;
      }
      .btn.primary {
        @apply bg-blue-600 text-white border-blue-600;
      }
      .btn.danger {
        @apply border-red-500 text-red-600;
      }
    `,
  ],
})
export class TranslationsPageComponent {
  readonly svc = inject(TranslationsService);

  langSel = this.svc.lang();
  query = '';
  private flat = computed(() => this.svc.flatten(this.svc.dict()));

  rows = computed(() => {
    const q = this.query.toLowerCase().trim();
    const entries = Object.entries(this.flat());
    if (!q) return entries.map(([key, value]) => ({ key, value }));
    return entries
      .filter(
        ([k, v]) =>
          k.toLowerCase().includes(q) || String(v).toLowerCase().includes(q)
      )
      .map(([key, value]) => ({ key, value }));
  });

  filteredCount = computed(() => this.rows().length);

  constructor() {
    // carga inicial
    this.svc.load(this.langSel);
  }

  onChangeLang(lang: any) {
    this.svc.load(lang);
  }

  onAdd() {
    const key = prompt('Nueva clave (formato: seccion.subseccion.clave):');
    if (!key) return;
    if (
      this.flat()[key] != null &&
      !confirm('La clave ya existe. ¿Sobrescribir?')
    )
      return;
    this.svc.addKey(key, '');
  }

  onExport() {
    const blob = this.svc.exportBlob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${this.svc.lang()}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }

  async onSave() {
    await this.svc.saveToServer('/api/i18n/save'); // Implementa endpoint en tu backend
    alert('Guardado');
  }
}
