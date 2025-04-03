import { Filter } from 'src/app/core/models/general.model';

export interface RecipeModel {
  id: number;
  title: string;
  category: string;
  owner: string;
  ingredients: string;
  recipe: string;
  img?: string;
  year: number;
}
export const categoryFilterRecipes: Filter[] = [
  { code: 'APERITIVO', name: 'APERITIVOS' },
  { code: 'POSTRE', name: 'POSTRES' },
  { code: 'CUCHARA', name: 'CUCHARA' },
];
