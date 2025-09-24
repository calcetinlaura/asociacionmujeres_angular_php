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
  time_start?: string;
  time_end?: string;
  description?: string;
  online_link?: string;
  province: string;
  town: string;
  place_id?: number;
  sala_id?: number;
  capacity?: number;
  img?: string;
  status?: EnumStatusEvent;
  status_reason?: string;
  inscription?: boolean;
  inscription_method?: string;
  isPast?: boolean;
  macroevent_id?: number;
  project_id?: number;
  access?: string;
  ticket_prices: TicketPriceModel[];
  tickets_method: string;
  periodic: boolean;
  periodic_id: string;
}
export interface DayEventModel {
  id: number;
  periodic_id?: string;
  start: string;
  end: string;
  time_start: string;
  time_end: string;
}
export interface TicketPriceModel {
  type: string;
  price: number;
}

export enum EnumStatusEvent {
  EJECUCION = 'EJECUCION',
  CANCELADO = 'CANCELADO',
  APLAZADO = 'APLAZADO',
  AGOTADO = 'AGOTADO',
}

export type CategoryCode =
  | 'CINEMA'
  | 'WORKSHOP'
  | 'THEATER'
  | 'ACTIVISM'
  | 'MUSIC'
  | 'TALK'
  | 'EXPOSURE'
  | 'LEISURE'
  | 'EXHIBITION'
  | 'LITERATURE'
  | 'COURSE';

export const CATEGORY_UI: Record<
  CategoryCode,
  { label: string; icon: string }
> = {
  CINEMA: { label: 'Cine', icon: 'uil-film' },
  WORKSHOP: { label: 'Taller', icon: 'uil-brush-alt' },
  THEATER: { label: 'Teatro', icon: 'uil-theater-masks' },
  ACTIVISM: { label: 'Activismo', icon: 'uil-megaphone' },
  MUSIC: { label: 'Música', icon: 'uil-music' },
  TALK: { label: 'Charla', icon: 'uil-music' },
  EXPOSURE: { label: 'Exposición', icon: 'uil-music' },
  LEISURE: { label: 'Ocio', icon: 'uil-music' },
  EXHIBITION: { label: 'Exhibición', icon: 'uil-music' },
  LITERATURE: { label: 'Literatura', icon: 'uil-music' },
  COURSE: { label: 'Curso', icon: 'uil-music' },
};

export const CATEGORY_LIST = (
  Object.entries(CATEGORY_UI) as [
    CategoryCode,
    { label: string; icon: string }
  ][]
).map(([code, ui]) => ({ code, ...ui }));

export const statusEvent: Filter[] = [
  { code: 'EJECUCION', name: 'En ejecución' },
  { code: 'CANCELADO', name: 'Cancelado' },
  { code: 'APLAZADO', name: 'Aplazado' },
  { code: 'AGOTADO', name: 'Agotado' },
];

export interface EventModelFullData extends EventModel {
  category?: CategoryCode[] | [];
  placeData?: PlaceModel;
  salaData?: SalaModel;
  organizer?: AgentAutocompleteModel[];
  collaborator?: AgentAutocompleteModel[];
  sponsor?: AgentAutocompleteModel[];
  macroeventData?: MacroeventModel;
  projectData?: ProjectModel;
  periodicEvents?: DayEventModel[];
}
