import { computed, Signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { map, Observable } from 'rxjs';

type Ctor<T> = {
  // Permite null/undefined para ser null-safe con facades que emiten nulos
  filtered$: Observable<T[] | null | undefined>;
  sort: (arr: T[]) => T[];
  count: (arr: T[]) => number;
  map?: (arr: T[]) => T[]; // opcional: enriquecer/normalizar
  initial?: T[]; // valor inicial si no hay datos aún
};

export function useEntityList<T>({
  filtered$,
  sort,
  count,
  map: project,
  initial = [],
}: Ctor<T>): {
  filteredSig: Signal<T[]>;
  processedSig: Signal<T[]>;
  sortedSig: Signal<T[]>; // alias para compatibilidad con las páginas
  countSig: Signal<number>;
} {
  // 1) Normaliza el stream a arrays no nulos
  const normalized$ = filtered$.pipe(map((arr) => arr ?? initial));

  // 2) Signal base (siempre T[])
  const filteredSig = toSignal(normalized$, { initialValue: initial });

  // 3) Mapeo opcional + ordenación
  const processedSig = computed(() => {
    const base = filteredSig(); // siempre T[]
    const mapped = project ? project(base) : base;
    return sort(mapped);
  });

  // 4) Recuento derivado
  const countSig = computed(() => count(processedSig()));

  // 5) Alias para que el código de las páginas siga usando sortedSig()
  const sortedSig = processedSig;

  return { filteredSig, processedSig, sortedSig, countSig };
}
