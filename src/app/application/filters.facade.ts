import { computed, Injectable, signal } from '@angular/core';
import { Filter } from 'src/app/core/interfaces/general.interface';
import { TypeList } from 'src/app/core/models/general.model';

// Importa filtros predefinidos
import { genderFilterBooks } from 'src/app/core/interfaces/book.interface';
import { CategoryFilterAgents } from '../core/interfaces/agent.interface';
import { categoryFilterCreditors } from '../core/interfaces/creditor.interface';
import { filterGallery } from '../core/interfaces/gallery.interface';
import { genderFilterMovies } from '../core/interfaces/movie.interface';
import { categoryFilterRecipes } from '../core/interfaces/recipe.interface';

@Injectable({ providedIn: 'root' })
export class FiltersFacade {
  // Signals
  private readonly _filters = signal<Filter[]>([]);
  private readonly _selected = signal<string | number>('');
  private readonly _search = signal<string>('');

  readonly filtersSig = this._filters.asReadonly();
  readonly selectedSig = this._selected.asReadonly();
  readonly searchSig = this._search.asReadonly();

  readonly selectedFilterNameSig = computed(() => {
    const filters = this._filters();
    const selected = this._selected();
    return filters.find((f) => f.code === selected)?.name ?? '';
  });

  // Carga de filtros por entidad
  loadFiltersFor(
    type: TypeList,
    selected: string | number = '',
    fromYear = 2018
  ): void {
    const current = new Date().getFullYear();

    switch (type) {
      case TypeList.Books:
        this._filters.set([
          { code: 'NOVEDADES', name: 'Novedades' },
          { code: '', name: 'Todos' },
          ...genderFilterBooks,
        ]);
        break;

      case TypeList.Movies:
        this._filters.set([{ code: '', name: 'Todos' }, ...genderFilterMovies]);
        break;

      case TypeList.Recipes:
        this._filters.set([
          { code: '', name: 'Todas' },
          ...categoryFilterRecipes,
        ]);
        break;

      case TypeList.Gallery:
        this._filters.set(filterGallery);
        break;

      case TypeList.Agents:
        this._filters.set([
          { code: '', name: 'Todos' },
          ...CategoryFilterAgents,
        ]);
        break;

      case TypeList.Creditors:
        this._filters.set([
          { code: '', name: 'Todos' },
          ...categoryFilterCreditors,
        ]);
        break;

      // Único caso con prefijo: Agenda YYYY
      case TypeList.Events: {
        const filters: Filter[] = [];
        for (let y = current; y >= fromYear; y--) {
          filters.push({
            code: String(y),
            name: y === current ? `Agenda ${y}` : String(y),
          });
        }
        this._filters.set(filters);
        break;
      }

      // SIN prefijo y con "Histórico"
      case TypeList.Macroevents:
      case TypeList.Projects:
      case TypeList.Partners:
      case TypeList.Subsidies: {
        const filters: Filter[] = [{ code: '', name: 'Histórico' }];
        for (let y = current; y >= fromYear; y--) {
          filters.push({ code: String(y), name: String(y) });
        }
        this._filters.set(filters);
        break;
      }

      // SIN prefijo y SIN "Histórico"
      case TypeList.Invoices: {
        const filters: Filter[] = [];
        for (let y = current; y >= fromYear; y--) {
          filters.push({ code: String(y), name: String(y) });
        }
        this._filters.set(filters);
        break;
      }

      default:
        this._filters.set([{ code: '', name: 'Todos' }]);
        break;
    }

    // Selección inicial
    const defaultSelected =
      selected !== '' ? String(selected) : String(current);
    this._selected.set(defaultSelected);
    this._search.set('');
  }

  // Operaciones de filtros
  selectFilter(code: string | number): void {
    this._selected.set(String(code));
  }

  clearSelected(): void {
    this._selected.set('');
  }

  clearAll(): void {
    this._selected.set('');
    this._search.set('');
  }

  // Búsqueda
  setSearch(keyword: string): void {
    this._search.set(keyword);
  }

  clearSearchInput(inputComponent?: unknown): void {
    const fn = (inputComponent as any)?.clear;
    if (typeof fn === 'function') fn.call(inputComponent);
  }
}
