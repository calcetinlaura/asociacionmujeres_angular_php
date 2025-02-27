export interface BookModel {
  title: string;
  author: string;
  description: string;
  gender: string;
  img: string;
  // imgFile: File | null;
  year: number;
}
export interface FormBookData {
  book: BookModel; // Suponiendo que BookModel ya está definido en tu código
  imgFile: File | null; // El archivo de imagen o null si no se seleccionó uno
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
