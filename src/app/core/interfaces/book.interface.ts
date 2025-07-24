import { Filter } from 'src/app/core/models/general.model';

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
  | 'MASCULINIDADES'
  | 'MATERNIDAD'
  | 'COMIC'
  | 'JUVENIL'
  | 'INFANTIL'
  | 'CLUB';

export const genderFilterBooks: Filter[] = [
  { code: 'ENSAYO', name: 'Ensayo' },
  { code: 'MASCULINIDADES', name: 'Masculinidades' },
  { code: 'MATERNIDAD', name: 'Maternidad' },
  { code: 'COMIC', name: 'Comic & Novela ilustrada' },
  { code: 'JUVENIL', name: 'Juvenil' },
  { code: 'INFANTIL', name: 'Infantil' },
  { code: 'CLUB', name: 'Club de lectura' },
];
