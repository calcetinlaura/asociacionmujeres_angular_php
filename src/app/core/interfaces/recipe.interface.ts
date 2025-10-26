import { Filter } from 'src/app/core/interfaces/general.interface';

export interface RecipeModel {
  id: number;
  title: string;
  category: string;
  owner: string;
  introduction: string;
  ingredients: string;
  recipe: string;
  img?: string;
  year: number;
}
export const categoryFilterRecipes: Filter[] = [
  { code: 'APERITIVO', name: 'Aperitivos' },
  { code: 'POSTRE', name: 'Postres' },
  { code: 'CUCHARA', name: 'Cuchara' },
];
