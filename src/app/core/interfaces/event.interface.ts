import { Filter } from '../models/general.model';
import { AgentAutocompleteModel } from './agent.interface';
import { MacroeventModel } from './macroevent.interface';
import { PlaceModel, SalaModel } from './place.interface';
import { ProjectModel } from './project.interface';

export interface EventModel {
  id: number;
  title: string;
  start: string;
  end: string;
  time?: string;
  description?: string;
  province: string;
  town: string;
  place_id?: number;
  sala_id?: number;
  capacity?: number;
  price?: string;
  img?: string;
  status?: EnumStatusEvent;
  status_reason?: string;
  inscription?: boolean;
  isPast?: boolean;
  macroevent_id?: number;
  project_id?: number;
}
export enum EnumStatusEvent {
  EJECUCION = 'EJECUCION',
  CANCELADO = 'CANCELADO',
  APLAZADO = 'APLAZADO',
  AGOTADO = 'AGOTADO',
}
export const statusEvent: Filter[] = [
  { code: 'EJECUCION', name: 'En ejecución' },
  { code: 'CANCELADO', name: 'Cancelado' },
  { code: 'APLAZADO', name: 'Aplazado' },
  { code: 'AGOTADO', name: 'Agotado' },
];

export interface EventModelFullData extends EventModel {
  placeData?: PlaceModel;
  salaData?: SalaModel;
  organizer?: AgentAutocompleteModel[];
  collaborator?: AgentAutocompleteModel[];
  sponsor?: AgentAutocompleteModel[];
  macroeventData?: MacroeventModel;
  projectData?: ProjectModel;
}
