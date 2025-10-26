import { Filter } from 'src/app/core/interfaces/general.interface';
import { EventModelFullData } from './event.interface';

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
export interface AgentsModelFullData extends AgentModel {
  events?: EventModelFullData[];
}
export type AgentRole = 'ORGANIZADOR' | 'COLABORADOR' | 'PATROCINADOR';
export type SortOrder = 'asc' | 'desc';
export interface AgentEventsQuery {
  role?: AgentRole;
  year?: number;
  order?: SortOrder; // por fecha (e.start)
}
export const CategoryFilterAgents: Filter[] = [
  { code: 'ORGANISMO', name: 'Organismo público' },
  { code: 'ASOCIACION', name: 'Asociación' },
  { code: 'COOPERATIVA', name: 'Cooperativa' },
];
