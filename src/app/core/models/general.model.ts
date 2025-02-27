// export type TypeList =
//   | 'EVENTS'
//   | 'BOOKS'
//   | 'MOVIES'
//   | 'RECIPES'
//   | 'PITERAS'
//   | 'PARTNERS'
//   | 'INVOICES'
//   | 'CREDITORS'
//   | 'SUBSIDIES';

// export type TypeActionModal = 'EDIT' | 'DELETE' | 'SHOW' | 'CREATE';
export enum TypeList {
  Events = 'EVENTS',
  Books = 'BOOKS',
  Movies = 'MOVIES',
  Recipes = 'RECIPES',
  Piteras = 'PITERAS',
  Partners = 'PARTNERS',
  Invoices = 'INVOICES',
  Creditors = 'CREDITORS',
  Subsidies = 'SUBSIDIES',
}

export enum TypeActionModal {
  Edit = 'EDIT',
  Delete = 'DELETE',
  Show = 'SHOW',
  Create = 'CREATE',
}
export interface Filter {
  code: string | number;
  name: string | number;
}
export const filterBooks: Filter[] = [
  { code: 'NOVEDADES', name: 'NOVEDADES' },
  { code: 'TODOS', name: 'TODOS' },
  { code: 'ENSAYO', name: 'ENSAYO' },
  { code: 'MASCULINIDADES', name: 'MASCULINIDADES' },
  { code: 'MATERNIDAD', name: 'MATERNIDAD' },
  { code: 'COMIC', name: 'COMIC & NOVELA ILUSTRADA' },
  { code: 'JUVENIL', name: 'JUVENIL' },
  { code: 'INFANTIL', name: 'INFANTIL' },
  { code: 'CLUB', name: 'CLUB LECTURA' },
];

export const filterMovies: Filter[] = [
  { code: 'NOVEDADES', name: 'NOVEDADES' },
  { code: 'TODOS', name: 'TODOS' },
  { code: 'COMEDIA', name: 'COMEDIA' },
  { code: 'DRAMA', name: 'DRAMA' },
  { code: 'DOCUMENTAL', name: 'DOCUMENTAL' },
];

export const filterRecipes: Filter[] = [
  { code: 'NOVEDADES', name: 'NOVEDADES' },
  { code: 'APERITIVO', name: 'APERITIVOS' },
  { code: 'POSTRE', name: 'POSTRES' },
  { code: 'CUCHARA', name: 'CUCHARA' },
];

export const filterSubsidies: Filter[] = [
  { code: 'AYUNT_EQUIPAMIENTO', name: 'Ayuntamiento Equipamiento' },
  { code: 'AYUNT_ACTIVIDADES', name: 'Ayuntamiento Actividades' },
  { code: 'DIPUTACION', name: 'Diputación' },
  { code: 'GENERALITAT', name: 'Generalitat' },
  { code: 'MINISTERIO', name: 'Ministerio' },
];
