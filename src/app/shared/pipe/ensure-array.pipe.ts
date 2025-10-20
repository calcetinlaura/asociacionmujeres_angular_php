import { Pipe, PipeTransform } from '@angular/core';

@Pipe({ name: 'ensureArray', standalone: true })
export class EnsureArrayPipe implements PipeTransform {
  transform<T = any>(v: any): T[] {
    if (Array.isArray(v)) return v;
    if (typeof v === 'string') {
      const s = v.trim();
      if (s.startsWith('[') && s.endsWith(']')) {
        try {
          return JSON.parse(s) ?? [];
        } catch {
          return [];
        }
      }
    }
    return [];
  }
}
