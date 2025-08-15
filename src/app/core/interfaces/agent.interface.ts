import { Filter } from 'src/app/core/models/general.model';

export interface AgentModel {
  id: number;
  name: string;
  contact?: string;
  phone?: string;
  email?: string;
  province?: string;
  town?: string;
  address?: string;
  post_code?: string;
  category?: string;
  observations?: string;
  img?: string;
}

export interface AgentAutocompleteModel {
  id: number;
  name: string;
}
export const CategoryFilterAgents: Filter[] = [
  { code: 'ORGANISMO', name: 'Organismo público' },
  { code: 'ASOCIACION', name: 'Asociación' },
  { code: 'COOPERATIVA', name: 'Cooperativa' },
];
