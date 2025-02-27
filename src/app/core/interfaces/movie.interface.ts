export interface MovieModel {
  title: string;
  director: string;
  description: string;
  gender: string;
  img: string;
  year: number;
}

export type GenderMovies = 'COMEDIA' | 'DOCUMENTAL' | 'DRAMA';
