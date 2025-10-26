// src/app/shared/hooks/use-column-visibility.ts
import { computed, inject, Signal, WritableSignal } from '@angular/core';
import { ColumnModel } from 'src/app/core/interfaces/column.interface';
import { ColumnVisibilityStore } from 'src/app/shared/components/table/column-visibility.store';

type WithKey<K extends string> = ColumnModel & { key: K };

export function useColumnVisibility<K extends string>(
  storeKey: string,
  columns: ReadonlyArray<WithKey<K>>,
  hidden: ReadonlyArray<K> = []
): {
  columnVisSig: WritableSignal<Record<K, boolean>>;
  displayedColumnsSig: Signal<K[]>;
  getVisibleColumns: () => WithKey<K>[];
  toggleColumn: (colKey: K) => void;
  isColumnVisible: (colKey: K) => boolean;
} {
  const store = inject(ColumnVisibilityStore);

  // 👇 Copias mutables para encajar con la firma del store (evita TS2352)
  const columnsMutable: ColumnModel[] = [...columns];
  const hiddenMutable: string[] = [...hidden] as string[];

  const columnVisSig = store.init(
    storeKey,
    columnsMutable,
    hiddenMutable
  ) as WritableSignal<Record<K, boolean>>;

  const displayedColumnsSig = computed<K[]>(
    () =>
      store.displayedColumns(
        columnsMutable,
        columnVisSig() as Record<string, boolean>
      ) as K[]
  );

  const getVisibleColumns = (): WithKey<K>[] =>
    store.visibleColumnModels(
      columnsMutable,
      columnVisSig() as Record<string, boolean>
    ) as WithKey<K>[];

  const toggleColumn = (colKey: K): void => {
    // El store tipa Record<string, boolean>, por eso este cast
    store.toggle(
      storeKey,
      columnVisSig as unknown as WritableSignal<Record<string, boolean>>,
      colKey
    );
  };

  const isColumnVisible = (colKey: K): boolean => !!columnVisSig()[colKey];

  return {
    columnVisSig,
    displayedColumnsSig,
    getVisibleColumns,
    toggleColumn,
    isColumnVisible,
  };
}
