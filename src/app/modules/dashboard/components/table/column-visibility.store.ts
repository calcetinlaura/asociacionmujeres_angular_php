import { Injectable, signal, WritableSignal } from '@angular/core';
import { ColumnModel } from 'src/app/core/interfaces/column.interface';

type Visibility = Record<string, boolean>;

@Injectable({ providedIn: 'root' })
export class ColumnVisibilityStore {
  private readonly prefix = 'tableColumns:';

  init(
    key: string,
    columns: ColumnModel[],
    hidden: string[] = []
  ): WritableSignal<Visibility> {
    const saved = localStorage.getItem(this.prefix + key);
    if (saved) return signal<Visibility>(JSON.parse(saved));

    const map: Visibility = {};
    for (const c of columns) map[c.key] = !hidden.includes(c.key);
    return signal<Visibility>(map);
  }

  toggle(key: string, stateSig: WritableSignal<Visibility>, colKey: string) {
    const next = { ...stateSig(), [colKey]: !stateSig()[colKey] };
    stateSig.set(next);
    localStorage.setItem(this.prefix + key, JSON.stringify(next));
  }

  displayedColumns(columns: ColumnModel[], vis: Visibility) {
    return columns.filter((c) => vis[c.key]).map((c) => c.key);
  }

  visibleColumnModels(columns: ColumnModel[], vis: Visibility) {
    return columns.filter((c) => vis[c.key]);
  }
}
