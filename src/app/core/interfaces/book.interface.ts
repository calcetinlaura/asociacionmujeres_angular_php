export interface BookModel {
  title: string;
  author: string;
  description: string;
  gender: string;
  img: string;
  // imgFile: File | null;
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
