// src/app/i18n/translations.service.ts
import { HttpClient } from '@angular/common/http';
import { computed, Injectable, signal } from '@angular/core';

export type LangCode = 'es' | 'en'; // amplía según necesites
export type TransDict = Record<string, unknown>; // admite anidados (objetos)

@Injectable({ providedIn: 'root' })
export class TranslationsService {
  private readonly langsAvail: LangCode[] = ['es', 'en'];
  readonly languages = this.langsAvail;

  readonly lang = signal<LangCode>('es');
  readonly dict = signal<TransDict>({});
  readonly dirty = signal(false);
  readonly count = computed(
    () => Object.keys(this.flatten(this.dict())).length
  );

  constructor(private http: HttpClient) {}

  async load(lang: LangCode) {
    this.lang.set(lang);
    const data = await this.http
      .get<TransDict>(`/assets/i18n/${lang}.json`)
      .toPromise();
    this.dict.set(data ?? {});
    this.dirty.set(false);
  }

  setValue(path: string, value: string) {
    const updated = { ...this.dict() };
    this.setByPath(updated, path, value);
    this.dict.set(updated);
    this.dirty.set(true);
  }

  addKey(path: string, value = '') {
    this.setValue(path, value);
  }

  removeKey(path: string) {
    const updated = { ...this.dict() };
    this.deleteByPath(updated, path);
    this.dict.set(updated);
    this.dirty.set(true);
  }

  exportBlob(): Blob {
    return new Blob([JSON.stringify(this.dict(), null, 2)], {
      type: 'application/json',
    });
  }

  // (Opcional) Guardar en backend
  async saveToServer(url = '/api/i18n/save') {
    const body = { lang: this.lang(), dict: this.dict() };
    await this.http.post(url, body).toPromise();
    this.dirty.set(false);
  }

  // Helpers para paths "a.b.c"
  private setByPath(obj: any, path: string, value: unknown) {
    const parts = path.split('.');
    let cur = obj;
    while (parts.length > 1) {
      const k = parts.shift()!;
      cur[k] ??= {};
      cur = cur[k];
    }
    cur[parts[0]] = value;
  }
  private deleteByPath(obj: any, path: string) {
    const parts = path.split('.');
    let cur = obj;
    while (parts.length > 1) {
      const k = parts.shift()!;
      if (!cur[k]) return;
      cur = cur[k];
    }
    delete cur[parts[0]];
  }
  // flatten para listar en tabla
  flatten(obj: any, prefix = ''): Record<string, string> {
    const out: Record<string, string> = {};
    for (const k of Object.keys(obj ?? {})) {
      const key = prefix ? `${prefix}.${k}` : k;
      if (
        obj[k] != null &&
        typeof obj[k] === 'object' &&
        !Array.isArray(obj[k])
      ) {
        Object.assign(out, this.flatten(obj[k], key));
      } else {
        out[key] = String(obj[k]);
      }
    }
    return out;
  }
}
