import { Filter } from '../models/general.model';

export interface CreditorModel {
  id: number;
  company: string;
  cif?: string;
  contact?: string;
  phone?: string;
  email?: string;
  town?: string;
  address?: string;
  post_code?: string;
  category?: string;
  key_words?: string;
  observations?: string;
}
export interface CreditorAutocompleteModel {
  id: number;
  company: string;
  cif?: string;
}
export const FilterCreditors: Filter[] = [
  { code: 'CINE', name: 'Cine' },
  { code: 'COCINE', name: 'Cocina' },
  { code: 'CHARLAS', name: 'Charlas' },
  { code: 'LOGÍSTICA', name: 'Logística y materiales' },
  { code: 'CURSOS', name: 'Cursos y talleres' },
  { code: 'ESPECTÁCULOS', name: 'Espectáculos' },
  { code: 'DISEÑO', name: 'Diseño gráfico e ilustración' },
  { code: 'VIAJES', name: 'Viajes' },
];
