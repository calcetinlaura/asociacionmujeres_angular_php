import { Filter } from '../models/general.model';

export interface BookModel {
  id: number;
  title: string;
  author?: string;
  description?: string;
  gender: string;
  img?: string;
  year: number;
}

export type GenderBooks =
  | 'ENSAY0'
  | 'NOVEDADES'
  | 'TODOS'
  | 'MASCULINIDADES'
  | 'MATERNIDAD'
  | 'COMIC'
  | 'JUVENIL'
  | 'INFANTIL'
  | 'CLUB';

export const GenderFilterBooks: Filter[] = [
  { code: 'ENSAYO', name: 'ENSAYO' },
  { code: 'MASCULINIDADES', name: 'MASCULINIDADES' },
  { code: 'MATERNIDAD', name: 'MATERNIDAD' },
  { code: 'COMIC', name: 'COMIC & NOVELA ILUSTRADA' },
  { code: 'JUVENIL', name: 'JUVENIL' },
  { code: 'INFANTIL', name: 'INFANTIL' },
  { code: 'CLUB', name: 'CLUB LECTURA' },
];
