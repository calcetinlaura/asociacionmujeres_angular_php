import { AgentAutocompleteModel } from './agent.interface';
import { MacroeventModel } from './macroevent.interface';
import { PlaceModel, SalaModel } from './place.interface';

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
  status?: string;
  status_reason?: string;
  inscription?: boolean;
  isPast?: boolean;
  macroevent_id?: number;
}

export interface EventModelFullData extends EventModel {
  placeData?: PlaceModel;
  salaData?: SalaModel;
  organizer?: AgentAutocompleteModel[];
  collaborator?: AgentAutocompleteModel[];
  sponsor?: AgentAutocompleteModel[];
  macroeventData?: MacroeventModel;
}
