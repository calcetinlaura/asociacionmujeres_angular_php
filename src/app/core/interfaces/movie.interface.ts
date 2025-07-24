import { Filter } from 'src/app/core/models/general.model';

export interface MovieModel {
  id: number;
  title: string;
  director?: string;
  description?: string;
  gender: string;
  img?: string;
  year: number;
}

export type GenderMovies = 'COMEDIA' | 'DOCUMENTAL' | 'DRAMA';

export const genderFilterMovies: Filter[] = [
  { code: 'COMEDIA', name: 'Comedia' },
  { code: 'DOCUMENTAL', name: 'Documental' },
  { code: 'DRAMA', name: 'Drama' },
];
